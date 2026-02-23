package cm.gov.pki.controller;

import cm.gov.pki.dto.AuthDTO;
import cm.gov.pki.entity.Certificate;
import cm.gov.pki.entity.CertificateRequest;
import cm.gov.pki.entity.User;
import cm.gov.pki.repository.CertificateRepository;
import cm.gov.pki.repository.CertificateRequestRepository;
import cm.gov.pki.service.CAService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@RestController
@RequestMapping({"/user", "/api/user"})
public class UserController {

    private static final Logger log = LoggerFactory.getLogger(UserController.class);
    private static final long MAX_FILE_SIZE = 100L * 1024L * 1024L; // 100MB
    private static final long MAX_CSR_SIZE = 200L * 1024L; // 200KB
    private static final List<String> ALLOWED_TYPES = List.of(
            "application/pdf",
            "image/png",
            "image/jpeg",
            "image/jpg",
            "image/gif",
            "text/plain"
    );

    private Path uploadRoot() {
        String configured = System.getenv("PKI_UPLOAD_DIR");
        if (configured != null && !configured.isBlank()) {
            return Paths.get(configured);
        }
        return Paths.get(System.getProperty("user.dir"), "uploads");
    }

    private final CertificateRepository certificateRepository;
    private final CertificateRequestRepository certificateRequestRepository;
    private final CAService caService;

    @Autowired
    public UserController(
            CertificateRepository certificateRepository,
            CertificateRequestRepository certificateRequestRepository,
            CAService caService
    ) {
        this.certificateRepository = certificateRepository;
        this.certificateRequestRepository = certificateRequestRepository;
        this.caService = caService;
    }

    @GetMapping("/me")
    public ResponseEntity<AuthDTO.UserDTO> me(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof User)) {
            return ResponseEntity.status(401).build();
        }

        User user = (User) authentication.getPrincipal();
        AuthDTO.UserDTO dto = new AuthDTO.UserDTO();
        dto.setId(user.getId());
        dto.setEmail(user.getEmail());
        dto.setFirstName(user.getFirstName());
        dto.setLastName(user.getLastName());
        dto.setRole(user.getRole().name());
        dto.setIsActive(user.getIsActive());
        dto.setEmailVerified(user.getEmailVerified());
        dto.setCreatedAt(user.getCreatedAt());
        dto.setLastLogin(user.getLastLogin());
        return ResponseEntity.ok(dto);
    }

    @GetMapping("/certificates")
    public ResponseEntity<?> getMyCertificates(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof User)) {
            return ResponseEntity.status(401).build();
        }
        User user = (User) authentication.getPrincipal();
        var certs = certificateRepository.findByUserOrderByIssuedAtDesc(user);
        var result = certs.stream().map(CertificateDTO::new).toList();
        return ResponseEntity.ok(result);
    }

    /**
     * Etapes 1-2: soumission pour verification admin.
     */
    @PostMapping(value = "/certificate-requests", consumes = {"multipart/form-data"})
    public ResponseEntity<?> submitCertificateRequest(
            Authentication authentication,
            @RequestParam(name = "commonName", required = false) String commonName,
            @RequestParam(name = "organization", required = false) String organization,
            @RequestParam(name = "organizationalUnit", required = false) String organizationalUnit,
            @RequestParam(name = "locality", required = false) String locality,
            @RequestParam(name = "state", required = false) String state,
            @RequestParam(name = "country", required = false) String country,
            @RequestParam(name = "email", required = false) String email,
            @RequestPart(name = "documents", required = false) MultipartFile[] documents
    ) {
        if (authentication == null || !(authentication.getPrincipal() instanceof User)) {
            return ResponseEntity.status(401).build();
        }
        User user = (User) authentication.getPrincipal();

        CertificateRequest req = new CertificateRequest();
        req.setUser(user);
        req.setCommonName((commonName == null || commonName.isBlank()) ? (user.getFirstName() + " " + user.getLastName()) : commonName.trim());
        req.setOrganization(organization);
        req.setOrganizationalUnit(organizationalUnit);
        req.setLocality(locality);
        req.setState(state);
        req.setCountry(country);
        req.setEmail((email == null || email.isBlank()) ? user.getEmail() : email.trim());
        req.setCsrContent(null);

        String validationError = validateBaseRequest(req);
        if (validationError != null) {
            return ResponseEntity.status(400).body(Map.of("error", validationError));
        }

        req.setStatus("PENDING_REVIEW");
        req.setSubmittedAt(LocalDateTime.now());
        req = certificateRequestRepository.save(req);

        String savedDocs = saveDocuments(req.getId(), documents);
        if (savedDocs == null) {
            try {
                certificateRequestRepository.delete(req);
            } catch (Exception ex) {
                log.warn("Failed to rollback request {}", req.getId(), ex);
            }
            return ResponseEntity.status(500).body(Map.of("error", "Erreur lors de l'enregistrement des fichiers"));
        }
        req.setDocuments(savedDocs);
        req.setNotes(savedDocs);
        req = certificateRequestRepository.save(req);

        return ResponseEntity.ok(Map.of(
                "requestId", req.getId().toString(),
                "status", req.getStatus(),
                "message", "Demande soumise pour verification admin"
        ));
    }

    /**
     * Correction apres rejet de verification admin.
     */
    @PutMapping(value = "/certificate-requests/{id}", consumes = {"multipart/form-data"})
    public ResponseEntity<?> updateCertificateRequest(
            Authentication authentication,
            @PathVariable("id") UUID id,
            @RequestParam(name = "commonName", required = false) String commonName,
            @RequestParam(name = "organization", required = false) String organization,
            @RequestParam(name = "organizationalUnit", required = false) String organizationalUnit,
            @RequestParam(name = "locality", required = false) String locality,
            @RequestParam(name = "state", required = false) String state,
            @RequestParam(name = "country", required = false) String country,
            @RequestParam(name = "email", required = false) String email,
            @RequestPart(name = "documents", required = false) MultipartFile[] documents
    ) {
        if (authentication == null || !(authentication.getPrincipal() instanceof User)) {
            return ResponseEntity.status(401).build();
        }
        User user = (User) authentication.getPrincipal();
        var opt = certificateRequestRepository.findByIdAndUser(id, user);
        if (opt.isEmpty()) return ResponseEntity.status(404).build();
        CertificateRequest req = opt.get();

        if (!"NEEDS_CORRECTION".equalsIgnoreCase(req.getStatus()) && !"REJECTED".equalsIgnoreCase(req.getStatus())) {
            return ResponseEntity.status(400).body(Map.of("error", "Request is not editable"));
        }

        req.setCommonName((commonName == null || commonName.isBlank()) ? req.getCommonName() : commonName.trim());
        req.setOrganization((organization == null || organization.isBlank()) ? req.getOrganization() : organization.trim());
        req.setOrganizationalUnit(organizationalUnit);
        req.setLocality((locality == null || locality.isBlank()) ? req.getLocality() : locality.trim());
        req.setState(state);
        req.setCountry((country == null || country.isBlank()) ? req.getCountry() : country.trim());
        if (email != null && !email.isBlank()) req.setEmail(email.trim());

        String validationError = validateBaseRequest(req);
        if (validationError != null) {
            return ResponseEntity.status(400).body(Map.of("error", validationError));
        }

        if (documents != null && documents.length > 0) {
            String savedDocs = saveDocuments(req.getId(), documents);
            if (savedDocs == null) {
                return ResponseEntity.status(500).body(Map.of("error", "Erreur lors de l'enregistrement des fichiers"));
            }
            req.setDocuments(savedDocs);
            req.setNotes(savedDocs);
        }

        req.setStatus("PENDING_REVIEW");
        req.setRejectionReason(null);
        req.setReviewedAt(null);
        req.setReviewedBy(null);
        req.setSubmittedAt(LocalDateTime.now());
        req = certificateRequestRepository.save(req);

        return ResponseEntity.ok(Map.of("requestId", req.getId().toString(), "status", req.getStatus()));
    }

    /**
     * Etape 3: soumission CSR apres validation admin.
     */
    @PostMapping(value = "/certificate-requests/{id}/submit-csr", consumes = {"multipart/form-data"})
    public ResponseEntity<?> submitCsrAfterReview(
            Authentication authentication,
            @PathVariable("id") UUID id,
            @RequestParam(name = "csr", required = false) String csr,
            @RequestPart(name = "csrFile", required = false) MultipartFile csrFile
    ) {
        if (authentication == null || !(authentication.getPrincipal() instanceof User)) {
            return ResponseEntity.status(401).build();
        }
        User user = (User) authentication.getPrincipal();
        var opt = certificateRequestRepository.findByIdAndUser(id, user);
        if (opt.isEmpty()) return ResponseEntity.status(404).build();
        CertificateRequest req = opt.get();

        if (!"REVIEW_APPROVED".equalsIgnoreCase(req.getStatus())) {
            return ResponseEntity.status(400).body(Map.of("error", "Admin verification not approved yet"));
        }

        String csrContent = csr;
        if ((csrContent == null || csrContent.isBlank()) && csrFile != null && !csrFile.isEmpty()) {
            if (csrFile.getSize() > MAX_CSR_SIZE) {
                return ResponseEntity.status(400).body(Map.of("error", "CSR trop volumineux (>200KB)"));
            }
            try (InputStream in = csrFile.getInputStream()) {
                csrContent = new String(in.readAllBytes(), StandardCharsets.UTF_8);
            } catch (IOException ex) {
                return ResponseEntity.status(400).body(Map.of("error", "Impossible de lire le fichier CSR"));
            }
        }
        if (csrContent == null || csrContent.isBlank()) {
            return ResponseEntity.status(400).body(Map.of("error", "Un CSR est requis (texte ou fichier)"));
        }

        return finalizeCsrSubmission(req, csrContent);
    }

    /**
     * Etape 3 (alternative): generation serveur d'une CSR puis soumission directe.
     */
    @PostMapping("/certificate-requests/{id}/generate-csr")
    public ResponseEntity<?> generateAndSubmitCsr(
            Authentication authentication,
            @PathVariable("id") UUID id,
            @RequestParam(name = "cn", required = false) String cn,
            @RequestParam(name = "o", required = false) String organization,
            @RequestParam(name = "ou", required = false) String organizationalUnit,
            @RequestParam(name = "l", required = false) String locality,
            @RequestParam(name = "st", required = false) String state,
            @RequestParam(name = "c", required = false) String country,
            @RequestParam(name = "email", required = false) String email
    ) {
        if (authentication == null || !(authentication.getPrincipal() instanceof User)) {
            return ResponseEntity.status(401).build();
        }
        User user = (User) authentication.getPrincipal();
        var opt = certificateRequestRepository.findByIdAndUser(id, user);
        if (opt.isEmpty()) return ResponseEntity.status(404).build();
        CertificateRequest req = opt.get();

        if (!"REVIEW_APPROVED".equalsIgnoreCase(req.getStatus())) {
            return ResponseEntity.status(400).body(Map.of("error", "Admin verification not approved yet"));
        }

        String resolvedCn = (cn == null || cn.isBlank()) ? req.getCommonName() : cn.trim();
        String resolvedOrg = (organization == null || organization.isBlank()) ? req.getOrganization() : organization.trim();
        String resolvedCountry = (country == null || country.isBlank()) ? req.getCountry() : country.trim().toUpperCase();
        if (resolvedCn == null || resolvedCn.isBlank()) {
            return ResponseEntity.status(400).body(Map.of("error", "Common Name requis"));
        }
        if (resolvedOrg == null || resolvedOrg.isBlank()) {
            return ResponseEntity.status(400).body(Map.of("error", "Organisation requise"));
        }
        if (resolvedCountry == null || !resolvedCountry.matches("^[A-Za-z]{2}$")) {
            return ResponseEntity.status(400).body(Map.of("error", "Pays invalide (ISO 2 lettres)"));
        }

        String resolvedOu = (organizationalUnit == null || organizationalUnit.isBlank()) ? req.getOrganizationalUnit() : organizationalUnit.trim();
        String resolvedLocality = (locality == null || locality.isBlank()) ? req.getLocality() : locality.trim();
        String resolvedState = (state == null || state.isBlank()) ? req.getState() : state.trim();
        String resolvedEmail = (email == null || email.isBlank()) ? req.getEmail() : email.trim();

        String generatedCsr = caService.generateCSR(
                resolvedCn,
                resolvedOrg,
                resolvedOu,
                resolvedLocality,
                resolvedState,
                resolvedCountry,
                resolvedEmail
        );
        return finalizeCsrSubmission(req, generatedCsr);
    }

    private ResponseEntity<?> finalizeCsrSubmission(CertificateRequest req, String csrContent) {
        req.setCsrContent(csrContent);
        req.setStatus("CSR_SUBMITTED");
        req.setSubmittedAt(LocalDateTime.now());
        req = certificateRequestRepository.save(req);
        return ResponseEntity.ok(Map.of("requestId", req.getId().toString(), "status", req.getStatus()));
    }

    @GetMapping("/certificate-requests")
    public ResponseEntity<?> getMyRequests(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof User)) {
            return ResponseEntity.status(401).build();
        }
        User user = (User) authentication.getPrincipal();
        var reqs = certificateRequestRepository.findByUserOrderBySubmittedAtDesc(user);
        var dto = reqs.stream().map(CertificateRequestDTO::new).toList();
        return ResponseEntity.ok(dto);
    }

    @GetMapping("/certificate-requests/{id}/documents/{filename}")
    public ResponseEntity<?> downloadDocument(
            Authentication authentication,
            @PathVariable("id") UUID id,
            @PathVariable("filename") String filename,
            @RequestParam(value = "preview", defaultValue = "false") boolean preview) {
        if (authentication == null || !(authentication.getPrincipal() instanceof User)) {
            return ResponseEntity.status(401).build();
        }
        User user = (User) authentication.getPrincipal();
        var opt = certificateRequestRepository.findByIdAndUser(id, user);
        if (opt.isEmpty()) return ResponseEntity.status(404).build();
        var req = opt.get();
        if (req.getDocuments() == null || !Arrays.asList(req.getDocuments().split(",")).contains(filename)) {
            return ResponseEntity.status(404).build();
        }

        Path path = uploadRoot().resolve(Paths.get("certificate_requests", id.toString(), filename));
        if (!Files.exists(path)) return ResponseEntity.status(404).build();
        try {
            Resource resource = new UrlResource(path.toUri());
            String contentType = "application/octet-stream";
            if (filename.endsWith(".pdf")) contentType = "application/pdf";
            else if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) contentType = "image/jpeg";
            else if (filename.endsWith(".png")) contentType = "image/png";
            else if (filename.endsWith(".gif")) contentType = "image/gif";
            else if (filename.endsWith(".txt")) contentType = "text/plain";
            String disposition = preview ? "inline" : "attachment";
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_TYPE, contentType)
                    .header(HttpHeaders.CONTENT_DISPOSITION, disposition + "; filename=\"" + filename + "\"")
                    .body(resource);
        } catch (Exception ex) {
            log.error("Error downloading document {} for request {}", filename, id, ex);
            return ResponseEntity.status(500).body(Map.of("error", "Erreur serveur"));
        }
    }

    @PostMapping("/certificate-requests/{requestId}/validate-token")
    public ResponseEntity<?> validateToken(
            Authentication authentication,
            @PathVariable("requestId") UUID requestId,
            @RequestParam(value = "token") String token) {
        if (authentication == null || !(authentication.getPrincipal() instanceof User)) {
            return ResponseEntity.status(401).build();
        }
        User user = (User) authentication.getPrincipal();

        var opt = certificateRequestRepository.findById(requestId);
        if (opt.isEmpty()) return ResponseEntity.status(404).body(Map.of("error", "Request not found"));
        CertificateRequest req = opt.get();

        if (!req.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(403).body(Map.of("error", "Unauthorized"));
        }
        if (!"ISSUED".equalsIgnoreCase(req.getStatus())) {
            return ResponseEntity.status(400).body(Map.of("error", "Request is not in ISSUED state"));
        }
        if (req.getValidationToken() == null || !req.getValidationToken().equals(token)) {
            return ResponseEntity.status(400).body(Map.of("error", "Invalid token"));
        }
        if (req.getTokenExpiresAt() != null && LocalDateTime.now().isAfter(req.getTokenExpiresAt())) {
            return ResponseEntity.status(400).body(Map.of("error", "Token expired"));
        }
        if (req.getTokenUsedAt() != null) {
            return ResponseEntity.status(400).body(Map.of("error", "Token already used"));
        }

        req.setTokenUsedAt(LocalDateTime.now());
        certificateRequestRepository.save(req);

        var cert = certificateRepository.findFirstByRequestId(req.getId());
        if (cert.isEmpty()) return ResponseEntity.status(404).body(Map.of("error", "Certificate not found"));
        Certificate certificate = cert.get();

        return ResponseEntity.ok(Map.of(
                "certificateId", certificate.getId().toString(),
                "certificate", certificate.getCertificatePem(),
                "fingerprint", certificate.getFingerprintSha256(),
                "issuedAt", certificate.getIssuedAt(),
                "expiresAt", certificate.getNotAfter()
        ));
    }

    @GetMapping("/certificates/{certificateId}/download")
    public ResponseEntity<?> downloadCertificate(
            Authentication authentication,
            @PathVariable("certificateId") UUID certificateId,
            @RequestParam(value = "format", defaultValue = "pem") String format) {
        if (authentication == null || !(authentication.getPrincipal() instanceof User)) {
            return ResponseEntity.status(401).build();
        }
        User user = (User) authentication.getPrincipal();
        var certOpt = certificateRepository.findById(certificateId);
        if (certOpt.isEmpty()) return ResponseEntity.status(404).body(Map.of("error", "Certificate not found"));
        Certificate certificate = certOpt.get();
        if (!certificate.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(403).body(Map.of("error", "Unauthorized"));
        }

        String content = certificate.getCertificatePem();
        String fileName;
        String contentType;
        if ("pem".equalsIgnoreCase(format)) {
            fileName = "certificate-" + certificateId + ".pem";
            contentType = "application/x-pem-file";
        } else if ("crt".equalsIgnoreCase(format)) {
            fileName = "certificate-" + certificateId + ".crt";
            contentType = "application/x-x509-ca-cert";
        } else {
            return ResponseEntity.status(400).body(Map.of("error", "Invalid format"));
        }

        byte[] contentBytes = content.getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, contentType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                .header(HttpHeaders.CONTENT_LENGTH, String.valueOf(contentBytes.length))
                .body(contentBytes);
    }

    private String validateBaseRequest(CertificateRequest req) {
        if (req.getCommonName() == null || req.getCommonName().isBlank()) return "Common Name (CN) est requis";
        if (req.getOrganization() == null || req.getOrganization().isBlank()) return "Organisation (O) est requise";
        if (req.getLocality() == null || req.getLocality().isBlank()) return "Ville (L) est requise";
        if (req.getCountry() == null || !req.getCountry().matches("^[A-Za-z]{2}$")) return "Pays (C) doit etre un code ISO 2 lettres";
        if (req.getEmail() == null || !req.getEmail().matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) return "Email invalide";
        return null;
    }

    private String saveDocuments(UUID requestId, MultipartFile[] documents) {
        if (documents == null || documents.length == 0) return "";
        try {
            List<String> invalid = new ArrayList<>();
            for (MultipartFile f : documents) {
                if (f == null || f.isEmpty()) continue;
                String ct = f.getContentType();
                if (ct == null || !ALLOWED_TYPES.contains(ct.toLowerCase()) || f.getSize() > MAX_FILE_SIZE) {
                    invalid.add(f.getOriginalFilename() == null ? "file" : f.getOriginalFilename());
                }
            }
            if (!invalid.isEmpty()) {
                throw new IllegalArgumentException("Fichiers non valides: " + String.join(",", invalid));
            }

            Path base = uploadRoot().resolve(Paths.get("certificate_requests", requestId.toString()));
            Files.createDirectories(base);
            List<String> saved = new ArrayList<>();
            for (MultipartFile f : documents) {
                if (f == null || f.isEmpty()) continue;
                String original = f.getOriginalFilename();
                String baseName = (original == null) ? "file" : Paths.get(original).getFileName().toString();
                String safeBase = baseName.replaceAll("[^a-zA-Z0-9._-]", "_");
                String safeName = UUID.randomUUID() + "_" + safeBase;
                Path target = base.resolve(safeName);
                try (InputStream in = f.getInputStream()) {
                    Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
                }
                saved.add(safeName);
            }
            return String.join(",", saved);
        } catch (IllegalArgumentException ex) {
            log.warn("Invalid document upload for request {}: {}", requestId, ex.getMessage());
            return null;
        } catch (Exception ex) {
            log.error("Error saving documents for request {}", requestId, ex);
            return null;
        }
    }

    public static class CertificateDTO {
        private String id;
        private String serialNumber;
        private String subjectDN;
        private String issuerDN;
        private String status;
        private String notBefore;
        private String notAfter;
        private String certificatePem;

        public CertificateDTO() {}

        public CertificateDTO(Certificate cert) {
            this.id = cert.getId().toString();
            this.serialNumber = cert.getSerialNumber();
            this.subjectDN = cert.getSubjectDN();
            this.issuerDN = cert.getIssuerDN();
            this.status = cert.getStatus().name();
            this.notBefore = cert.getNotBefore() != null ? cert.getNotBefore().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) : null;
            this.notAfter = cert.getNotAfter() != null ? cert.getNotAfter().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) : null;
            this.certificatePem = cert.getCertificatePem();
        }

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public String getSerialNumber() { return serialNumber; }
        public void setSerialNumber(String serialNumber) { this.serialNumber = serialNumber; }
        public String getSubjectDN() { return subjectDN; }
        public void setSubjectDN(String subjectDN) { this.subjectDN = subjectDN; }
        public String getIssuerDN() { return issuerDN; }
        public void setIssuerDN(String issuerDN) { this.issuerDN = issuerDN; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
        public String getNotBefore() { return notBefore; }
        public void setNotBefore(String notBefore) { this.notBefore = notBefore; }
        public String getNotAfter() { return notAfter; }
        public void setNotAfter(String notAfter) { this.notAfter = notAfter; }
        public String getCertificatePem() { return certificatePem; }
        public void setCertificatePem(String certificatePem) { this.certificatePem = certificatePem; }
    }

    public static class CertificateRequestDTO {
        private String id;
        private String commonName;
        private String organization;
        private String organizationalUnit;
        private String locality;
        private String state;
        private String country;
        private String email;
        private String status;
        private String submittedAt;
        private String rejectionReason;
        private String[] documents;

        public CertificateRequestDTO() {}

        public CertificateRequestDTO(CertificateRequest r) {
            this.id = r.getId().toString();
            this.commonName = r.getCommonName();
            this.organization = r.getOrganization();
            this.organizationalUnit = r.getOrganizationalUnit();
            this.locality = r.getLocality();
            this.state = r.getState();
            this.country = r.getCountry();
            this.email = r.getEmail();
            this.status = r.getStatus();
            this.submittedAt = r.getSubmittedAt() != null ? r.getSubmittedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) : null;
            this.rejectionReason = r.getRejectionReason();
            this.documents = r.getDocuments() != null && !r.getDocuments().isBlank() ? r.getDocuments().split(",") : new String[0];
        }

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public String getCommonName() { return commonName; }
        public void setCommonName(String commonName) { this.commonName = commonName; }
        public String getOrganization() { return organization; }
        public void setOrganization(String organization) { this.organization = organization; }
        public String getOrganizationalUnit() { return organizationalUnit; }
        public void setOrganizationalUnit(String organizationalUnit) { this.organizationalUnit = organizationalUnit; }
        public String getLocality() { return locality; }
        public void setLocality(String locality) { this.locality = locality; }
        public String getState() { return state; }
        public void setState(String state) { this.state = state; }
        public String getCountry() { return country; }
        public void setCountry(String country) { this.country = country; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
        public String getSubmittedAt() { return submittedAt; }
        public void setSubmittedAt(String submittedAt) { this.submittedAt = submittedAt; }
        public String getRejectionReason() { return rejectionReason; }
        public void setRejectionReason(String rejectionReason) { this.rejectionReason = rejectionReason; }
        public String[] getDocuments() { return documents; }
        public void setDocuments(String[] documents) { this.documents = documents; }
    }
}
