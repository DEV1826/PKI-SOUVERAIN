package cm.gov.pki.controller;

import cm.gov.pki.dto.AuthDTO;
import cm.gov.pki.entity.User;
import cm.gov.pki.entity.Certificate;
import cm.gov.pki.entity.CertificateRequest;
import cm.gov.pki.repository.CertificateRepository;
import cm.gov.pki.repository.CertificateRequestRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@RequestMapping({"/user", "/api/user"})
public class UserController {

	private static final Logger log = LoggerFactory.getLogger(UserController.class);

	private final CertificateRepository certificateRepository;
    private final CertificateRequestRepository certificateRequestRepository;

    @Autowired
    public UserController(CertificateRepository certificateRepository, CertificateRequestRepository certificateRequestRepository) {
        this.certificateRepository = certificateRepository;
        this.certificateRequestRepository = certificateRequestRepository;
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

	/**
	 * RÃ©cupÃ¨re les certificats de l'utilisateur connectÃ©
	 */
	@GetMapping("/certificates")
	public ResponseEntity<?> getMyCertificates(Authentication authentication) {
		if (authentication == null || !(authentication.getPrincipal() instanceof User)) {
			return ResponseEntity.status(401).build();
		}
		User user = (User) authentication.getPrincipal();
		var certs = certificateRepository.findByUserOrderByIssuedAtDesc(user);
		// Mapper vers un DTO simplifiÃ© pour Ã©viter d'exposer tout l'objet
		var result = certs.stream().map(cert -> new CertificateDTO(cert)).toList();
		return ResponseEntity.ok(result);
	}

    /**
     * Soumettre une nouvelle demande de certificat
     * Accepte un CSR (texte) et des piÃ¨ces justificatives en multipart
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
            @RequestParam(name = "csr", required = false) String csr,
            @RequestPart(name = "csrFile", required = false) org.springframework.web.multipart.MultipartFile csrFile,
            @RequestPart(name = "documents", required = false) MultipartFile[] documents
    ) {
        if (authentication == null || !(authentication.getPrincipal() instanceof User)) {
            return ResponseEntity.status(401).build();
        }
        User user = (User) authentication.getPrincipal();

        CertificateRequest req = new CertificateRequest();
        req.setUser(user);
        req.setCommonName(commonName == null ? user.getFirstName() + " " + user.getLastName() : commonName);
        req.setOrganization(organization);
        // If CSR text not provided but a CSR file was uploaded, try to read it

        // Validation stricte : un CSR (texte ou fichier) est obligatoire
        if ((csr == null || csr.isBlank()) && (csrFile == null || csrFile.isEmpty())) {
            return ResponseEntity.status(400).body(java.util.Map.of("error", "Un CSR est requis (texte ou fichier)"));
        }
        // Si CSR texte absent mais fichier prÃ©sent, lire le fichier
        if ((csr == null || csr.isBlank()) && csrFile != null && !csrFile.isEmpty()) {
            try {
                long csrSize = csrFile.getSize();
                if (csrSize > 200 * 1024) { // 200KB limit for CSR
                    return ResponseEntity.status(400).body(java.util.Map.of("error", "CSR trop volumineux (>200KB)"));
                }
                String contentType = csrFile.getContentType();
                // Accept text/* and some common CSR mime types
                if (contentType != null && !(contentType.startsWith("text/") || contentType.equals("application/pkcs10") || contentType.equals("application/x-pem-file") || contentType.equals("application/octet-stream"))) {
                    log.warn("Type MIME inattendu pour CSR: {}", contentType);
                }
                try (java.io.InputStream in = csrFile.getInputStream()) {
                    csr = new String(in.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
                }
            } catch (java.io.IOException ex) {
                log.warn("Impossible de lire le fichier CSR", ex);
                return ResponseEntity.status(400).body(java.util.Map.of("error", "Impossible de lire le fichier CSR"));
            }
        }
        req.setCsrContent(csr);
        // If the user provided an email override, validate it; otherwise use profile email
        if (email != null && !email.isBlank()) {
            String emailTrim = email.trim();
            if (!emailTrim.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) {
                return ResponseEntity.status(400).body(java.util.Map.of("error", "Email invalide"));
            }
            req.setEmail(emailTrim);
        } else {
            req.setEmail(user.getEmail());
        }

        // Set subject fields
        req.setOrganization(organization);
        req.setOrganizationalUnit(organizationalUnit);
        req.setLocality(locality);
        req.setState(state);
        req.setCountry(country);

        // Basic required field validation (CN, O, L, C, email)
        if (req.getCommonName() == null || req.getCommonName().isBlank()) {
            return ResponseEntity.status(400).body(java.util.Map.of("error", "Common Name (CN) est requis"));
        }
        if (req.getOrganization() == null || req.getOrganization().isBlank()) {
            return ResponseEntity.status(400).body(java.util.Map.of("error", "Organisation (O) est requise"));
        }
        if (req.getLocality() == null || req.getLocality().isBlank()) {
            return ResponseEntity.status(400).body(java.util.Map.of("error", "Ville (L) est requise"));
        }
        if (req.getCountry() == null || !req.getCountry().matches("^[A-Za-z]{2}$")) {
            return ResponseEntity.status(400).body(java.util.Map.of("error", "Pays (C) doit Ãªtre un code ISO 2 lettres"));
        }

        req.setStatus("PENDING");
        req.setSubmittedAt(java.time.LocalDateTime.now());

        // Validation des fichiers fournis (types autorisÃ©s et taille max)
        final long MAX_FILE_SIZE = 5L * 1024L * 1024L; // 5MB
        final java.util.List<String> ALLOWED_TYPES = java.util.List.of("application/pdf", "image/png", "image/jpeg", "image/jpg", "image/gif", "text/plain");

        if (documents != null && documents.length > 0) {
            java.util.List<String> invalid = new java.util.ArrayList<>();
            for (MultipartFile f : documents) {
                if (f.isEmpty()) continue;
                String ct = f.getContentType();
                long sz = f.getSize();
                if (ct == null || !ALLOWED_TYPES.contains(ct.toLowerCase())) {
                    invalid.add(f.getOriginalFilename() == null ? "file" : f.getOriginalFilename());
                } else if (sz > MAX_FILE_SIZE) {
                    invalid.add(f.getOriginalFilename() == null ? "file" : f.getOriginalFilename());
                }
            }
            if (!invalid.isEmpty()) {
                return ResponseEntity.status(400).body(java.util.Map.of("error", "Fichiers non valides (type/taille)", "files", invalid));
            }
        }

        req = certificateRequestRepository.save(req);

        // Sauvegarder physiquement les fichiers si fournis
        if (documents != null && documents.length > 0) {
            try {
                java.nio.file.Path base = java.nio.file.Paths.get(System.getProperty("user.dir"), "uploads", "certificate_requests", req.getId().toString());
                java.nio.file.Files.createDirectories(base);
                java.util.List<String> saved = new java.util.ArrayList<>();
                for (MultipartFile f : documents) {
                    if (f.isEmpty()) continue;
                    String original = f.getOriginalFilename();
                    String baseName = (original == null) ? "file" : java.nio.file.Paths.get(original).getFileName().toString();
                    String safeBase = baseName.replaceAll("[^a-zA-Z0-9._-]", "_");
                    String safeName = java.util.UUID.randomUUID().toString() + "_" + safeBase;
                    java.nio.file.Path target = base.resolve(safeName);
                    try (java.io.InputStream in = f.getInputStream()) {
                        java.nio.file.Files.copy(in, target, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
                    }
                    saved.add(safeName);
                }
                // Stocker la liste des fichiers dans la colonne documents (CSV)
                if (!saved.isEmpty()) {
                    req.setDocuments(String.join(",", saved));
                    // Enregistrer aussi dans notes la liste pour rÃ©fÃ©rence
                    req.setNotes(String.join(",", saved));
                    req = certificateRequestRepository.save(req);
                }
            } catch (java.io.IOException ex) {
                // En cas d'erreur d'E/S, supprimer la demande crÃ©Ã©e pour Ã©viter les orphelins
                log.error("Erreur lors de l'enregistrement des fichiers de la demande {}", req.getId(), ex);
                try {
                    certificateRequestRepository.delete(req);
                } catch (Exception delEx) {
                    log.warn("Impossible de supprimer la demande aprÃ¨s Ã©chec de sauvegarde des fichiers {}", req.getId(), delEx);
                }
                return ResponseEntity.status(500).body(java.util.Map.of("error", "Erreur lors de l'enregistrement des fichiers"));
            } catch (RuntimeException ex) {
                log.error("Erreur inattendue lors du traitement des fichiers de la demande {}", req.getId(), ex);
                return ResponseEntity.status(500).body(java.util.Map.of("error", "Erreur inattendue"));
            }
        }

        return ResponseEntity.ok(Map.of("requestId", req.getId().toString(), "status", req.getStatus()));
    }

    // DTO simplifiÃ© pour l'exposition API
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
            this.notBefore = cert.getNotBefore() != null ? cert.getNotBefore().format(java.time.format.DateTimeFormatter.ISO_LOCAL_DATE_TIME) : null;
            this.notAfter = cert.getNotAfter() != null ? cert.getNotAfter().format(java.time.format.DateTimeFormatter.ISO_LOCAL_DATE_TIME) : null;
            this.certificatePem = cert.getCertificatePem();
        }

        // Getters and Setters
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

    // RÃ©cupÃ©rer les demandes de certificat de l'utilisateur
    @GetMapping("/certificate-requests")
    public ResponseEntity<?> getMyRequests(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof User)) {
            return ResponseEntity.status(401).build();
        }
        User user = (User) authentication.getPrincipal();
        var reqs = certificateRequestRepository.findByUserOrderBySubmittedAtDesc(user);
        var dto = reqs.stream().map(r -> new CertificateRequestDTO(r)).toList();
        return ResponseEntity.ok(dto);
    }

    // TÃ©lÃ©charger/PrÃ©visualiser une piÃ¨ce jointe
    @GetMapping("/certificate-requests/{id}/documents/{filename}")
    public ResponseEntity<?> downloadDocument(
            Authentication authentication, 
            @PathVariable("id") java.util.UUID id, 
            @PathVariable("filename") String filename,
            @RequestParam(value = "preview", defaultValue = "false") boolean preview) {
        if (authentication == null || !(authentication.getPrincipal() instanceof User)) {
            return ResponseEntity.status(401).build();
        }
        User user = (User) authentication.getPrincipal();
        var opt = certificateRequestRepository.findByIdAndUser(id, user);
        if (opt.isEmpty()) return ResponseEntity.status(404).build();
        var req = opt.get();
        if (req.getDocuments() == null || !java.util.Arrays.asList(req.getDocuments().split(",")).contains(filename)) {
            return ResponseEntity.status(404).build();
        }
        java.nio.file.Path path = java.nio.file.Paths.get(System.getProperty("user.dir"), "uploads", "certificate_requests", id.toString(), filename);
        if (!java.nio.file.Files.exists(path)) return ResponseEntity.status(404).build();
        try {
            org.springframework.core.io.Resource resource = new org.springframework.core.io.UrlResource(path.toUri());
            // DÃ©terminer le type MIME en fonction de l'extension du fichier
            String contentType = "application/octet-stream"; // default
            if (filename.endsWith(".pdf")) {
                contentType = "application/pdf";
            } else if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) {
                contentType = "image/jpeg";
            } else if (filename.endsWith(".png")) {
                contentType = "image/png";
            } else if (filename.endsWith(".gif")) {
                contentType = "image/gif";
            } else if (filename.endsWith(".txt")) {
                contentType = "text/plain";
            }
            
            // Si preview=true, utiliser "inline" (affichage dans le navigateur)
            // Sinon, utiliser "attachment" (tÃ©lÃ©chargement)
            String disposition = preview ? "inline" : "attachment";
            
            return ResponseEntity.ok()
                    .header(org.springframework.http.HttpHeaders.CONTENT_TYPE, contentType)
                    .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, disposition + "; filename=\"" + filename + "\"")
                    .body(resource);
        } catch (java.net.MalformedURLException ex) {
            log.error("URL invalide pour le fichier {} du tÃ©lÃ©chargement {}", filename, id, ex);
            return ResponseEntity.status(400).body(java.util.Map.of("error", "Nom de fichier invalide"));
        } catch (RuntimeException ex) {
            log.error("Erreur lors du chargement de la ressource {} pour la demande {}", filename, id, ex);
            return ResponseEntity.status(500).body(java.util.Map.of("error", "Erreur serveur"));
        }
    }

    // DTO pour les demandes
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
        private String[] documents;

        public CertificateRequestDTO() {}

        public CertificateRequestDTO(CertificateRequest r) {
            this.id = r.getId().toString();
            this.commonName = r.getCommonName();
            this.organization = r.getOrganization();
            this.organizationalUnit = r.getOrganizationalUnit();
            this.locality = r.getLocality();
            this.state = r.getTokenUsedAt() != null ? null : null; // placeholder if needed
            this.country = r.getCountry();
            this.email = r.getEmail();
            this.status = r.getStatus();
            this.submittedAt = r.getSubmittedAt() != null ? r.getSubmittedAt().format(java.time.format.DateTimeFormatter.ISO_LOCAL_DATE_TIME) : null;
            this.documents = r.getDocuments() != null ? r.getDocuments().split(",") : new String[0];
        }

        // Getters and Setters
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

        public String[] getDocuments() { return documents; }
        public void setDocuments(String[] documents) { this.documents = documents; }
    }

	/**
	 * Valide le token d'un utilisateur et retourne le certificat signÃ©
	 * Endpoint: POST /user/certificate-requests/{requestId}/validate-token?token=...
	 */
	@PostMapping("/certificate-requests/{requestId}/validate-token")
	public ResponseEntity<?> validateToken(
			Authentication authentication,
			@PathVariable("requestId") java.util.UUID requestId,
			@RequestParam(value = "token") String token) {
		
		if (authentication == null || !(authentication.getPrincipal() instanceof User)) {
			return ResponseEntity.status(401).build();
		}
		
		User user = (User) authentication.getPrincipal();
		
		// RÃ©cupÃ©rer la demande
		var opt = certificateRequestRepository.findById(requestId);
		if (opt.isEmpty()) {
			return ResponseEntity.status(404).body(Map.of("error", "Request not found"));
		}
		
		CertificateRequest req = opt.get();
		
		// VÃ©rifier que l'utilisateur est propriÃ©taire de la demande
		if (!req.getUser().getId().equals(user.getId())) {
			return ResponseEntity.status(403).body(Map.of("error", "Unauthorized"));
		}
		
		// VÃ©rifier que le status est ISSUED
		if (!"ISSUED".equalsIgnoreCase(req.getStatus())) {
			return ResponseEntity.status(400).body(Map.of("error", "Request is not in ISSUED state"));
		}
		
		// VÃ©rifier le token
		if (req.getValidationToken() == null || !req.getValidationToken().equals(token)) {
			return ResponseEntity.status(400).body(Map.of("error", "Invalid token"));
		}
		
		// VÃ©rifier que le token n'a pas expirÃ©
		if (req.getTokenExpiresAt() != null && 
		    java.time.LocalDateTime.now().isAfter(req.getTokenExpiresAt())) {
			return ResponseEntity.status(400).body(Map.of("error", "Token expired"));
		}
		
		// VÃ©rifier que le token n'a pas dÃ©jÃ  Ã©tÃ© utilisÃ©
		if (req.getTokenUsedAt() != null) {
			return ResponseEntity.status(400).body(Map.of("error", "Token already used"));
		}
		
		// Marquer le token comme utilisÃ©
		req.setTokenUsedAt(java.time.LocalDateTime.now());
		certificateRequestRepository.save(req);
		
		// RÃ©cupÃ©rer le certificat signÃ© depuis la base de donnÃ©es
		var cert = certificateRepository.findFirstByRequestId(req.getId());
		if (cert.isEmpty()) {
			return ResponseEntity.status(404).body(Map.of("error", "Certificate not found"));
		}
		
		Certificate certificate = cert.get();
		
		// Retourner le certificat
		return ResponseEntity.ok(Map.of(
			"certificateId", certificate.getId().toString(),
			"certificate", certificate.getCertificatePem(),
			"fingerprint", certificate.getFingerprintSha256(),
			"issuedAt", certificate.getIssuedAt(),
			"expiresAt", certificate.getNotAfter()
		));
	}

	/**
	 * TÃ©lÃ©charger un certificat par ID
	 * Endpoint: GET /user/certificates/{certificateId}/download
	 */
	@GetMapping("/certificates/{certificateId}/download")
	public ResponseEntity<?> downloadCertificate(
			Authentication authentication,
			@PathVariable("certificateId") java.util.UUID certificateId,
			@RequestParam(value = "format", defaultValue = "pem") String format) {
		
		if (authentication == null || !(authentication.getPrincipal() instanceof User)) {
			return ResponseEntity.status(401).build();
		}
		
		User user = (User) authentication.getPrincipal();
		
		// VÃ©rifier que le certificat appartient Ã  l'utilisateur
		var certOpt = certificateRepository.findById(certificateId);
		if (certOpt.isEmpty()) {
			return ResponseEntity.status(404).body(Map.of("error", "Certificate not found"));
		}
		
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
		
		try {
			byte[] contentBytes = content.getBytes(java.nio.charset.StandardCharsets.UTF_8);
			return ResponseEntity.ok()
					.header(org.springframework.http.HttpHeaders.CONTENT_TYPE, contentType)
					.header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
					.header(org.springframework.http.HttpHeaders.CONTENT_LENGTH, String.valueOf(contentBytes.length))
					.body(contentBytes);
		} catch (Exception ex) {
			log.error("Erreur lors du tÃ©lÃ©chargement du certificat {}", certificateId, ex);
			return ResponseEntity.status(500).body(Map.of("error", "Server error"));
		}
	}
}

