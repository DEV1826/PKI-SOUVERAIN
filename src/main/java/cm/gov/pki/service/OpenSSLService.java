package cm.gov.pki.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.attribute.PosixFilePermission;
import java.util.*;
import java.util.concurrent.TimeUnit;

/**
 * Service gérant les opérations cryptographiques via OpenSSL
 * Bridge Java → OpenSSL CLI
 * 
 * ITÉRATION 1 : Génération de l'AC Racine uniquement
 */
@Service
public class OpenSSLService {

    private static final Logger log = LoggerFactory.getLogger(OpenSSLService.class);

    @Value("${pki.openssl.binary:/usr/bin/openssl}")
    private String opensslBinary;

    @Value("${pki.ca.root-path:/opt/pki/ca}")
    private String caRootPath;

    @Value("${pki.ca.certs-path:/opt/pki/certs}")
    private String certsPath;

    @Value("${pki.ca.crl-path:/opt/pki/crl}")
    private String crlPath;

    /**
     * Initialise la structure de répertoires PKI
     */
    public void initializeDirectories() throws IOException {
        log.info("🗂️ Initialisation de la structure PKI...");
        
        createSecureDirectory(caRootPath, true);
        createSecureDirectory(certsPath, false);
        createSecureDirectory(crlPath, false);
        
        // Création du fichier serial
        Path serialPath = Paths.get(caRootPath, "serial");
        if (!Files.exists(serialPath)) {
            Files.writeString(serialPath, "1000\n");
        }
        
        // Création du fichier index.txt pour OpenSSL
        Path indexPath = Paths.get(caRootPath, "index.txt");
        if (!Files.exists(indexPath)) {
            Files.createFile(indexPath);
        }
        
        log.info("✅ Structure PKI initialisée");
    }

    /**
     * Génère l'Autorité de Certification Racine
     * Crée ca.key (clé privée) et ca.crt (certificat racine)
     */
    public Map<String, String> generateRootCA(String caName, int validityDays) throws Exception {
        log.info("🔐 Génération de l'AC Racine : {}");

        initializeDirectories();

        String keyPath = Paths.get(caRootPath, "ca.key").toString();
        String certPath = Paths.get(caRootPath, "ca.crt").toString();

        // 1. Génération de la clé privée RSA 4096 bits
        log.info("🔑 Génération de la clé privée RSA 4096... {}");
        executeOpenSSL(List.of(
            "genrsa",
            "-out", keyPath,
            "4096"
        ));

        // Sécuriser la clé privée (chmod 600)
        setFilePermissions(keyPath, true);

        // 2. Génération du certificat auto-signé
        log.info("📜 Génération du certificat racine auto-signé...");
        String subjectDN = String.format("/C=CM/O=PKI Souverain/CN=%s", caName);
        
        executeOpenSSL(List.of(
            "req",
            "-new",
            "-x509",
            "-key", keyPath,
            "-out", certPath,
            "-days", String.valueOf(validityDays),
            "-subj", subjectDN,
            "-sha256"
        ));

        log.info("✅ AC Racine générée avec succès");
        log.info("   📁 Clé privée : {}");
        log.info("   📁 Certificat : {}");

        return Map.of(
            "keyPath", keyPath,
            "certPath", certPath,
            "subjectDN", subjectDN
        );
    }

    /**
     * Vérifie la validité d'un certificat
     */
    public Map<String, String> verifyCertificate(String certPath) throws Exception {
        log.info("🔍 Vérification du certificat : {}");

        String output = executeOpenSSL(List.of(
            "x509",
            "-in", certPath,
            "-noout",
            "-subject",
            "-issuer",
            "-dates",
            "-fingerprint",
            "-sha256"
        ));

        return parseCertificateInfo(output);
    }

    /**
     * Récupère les informations d'un certificat
     */
    public String getCertificateText(String certPath) throws Exception {
        return executeOpenSSL(List.of(
            "x509",
            "-in", certPath,
            "-noout",
            "-text"
        ));
    }

    /**
     * Exécute une commande OpenSSL et retourne la sortie
     */
    private String executeOpenSSL(List<String> arguments) throws Exception {
        List<String> command = new ArrayList<>();
        command.add(opensslBinary);
        command.addAll(arguments);

        log.debug("🔧 Exécution : {}", String.join(" ", command));

        ProcessBuilder pb = new ProcessBuilder(command);
        pb.redirectErrorStream(true);

        Process process = pb.start();
        
        StringBuilder output = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(process.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                output.append(line).append("\n");
                log.debug("  → {}", line);
            }
        }

        boolean finished = process.waitFor(30, TimeUnit.SECONDS);
        if (!finished) {
            process.destroyForcibly();
            throw new RuntimeException("OpenSSL timeout après 30 secondes");
        }

        int exitCode = process.exitValue();
        if (exitCode != 0) {
            throw new RuntimeException("OpenSSL a échoué (code " + exitCode + "): " + output);
        }

        return output.toString();
    }

    /**
     * Crée un répertoire sécurisé
     */
    private void createSecureDirectory(String path, boolean restrictive) throws IOException {
        Path dir = Paths.get(path);
        if (!Files.exists(dir)) {
            Files.createDirectories(dir);
            log.info("📁 Répertoire créé : {}");
        }

        if (restrictive) {
            setDirectoryPermissions(path);
        }
    }

    /**
     * Définit les permissions d'un fichier (600 pour clés privées)
     */
    private void setFilePermissions(String filePath, boolean privateKey) throws IOException {
        Path path = Paths.get(filePath);
        Set<PosixFilePermission> perms = new HashSet<>();
        
        if (privateKey) {
            // 600 : Lecture/Écriture propriétaire uniquement
            perms.add(PosixFilePermission.OWNER_READ);
            perms.add(PosixFilePermission.OWNER_WRITE);
        } else {
            // 644 : Lecture pour tous, Écriture propriétaire
            perms.add(PosixFilePermission.OWNER_READ);
            perms.add(PosixFilePermission.OWNER_WRITE);
            perms.add(PosixFilePermission.GROUP_READ);
            perms.add(PosixFilePermission.OTHERS_READ);
        }
        
        Files.setPosixFilePermissions(path, perms);
        log.debug("🔒 Permissions {} définies pour {}", privateKey ? "600" : "644");
    }

    /**
     * Définit les permissions d'un répertoire (700)
     */
    private void setDirectoryPermissions(String dirPath) throws IOException {
        Path path = Paths.get(dirPath);
        Set<PosixFilePermission> perms = new HashSet<>();
        
        perms.add(PosixFilePermission.OWNER_READ);
        perms.add(PosixFilePermission.OWNER_WRITE);
        perms.add(PosixFilePermission.OWNER_EXECUTE);
        
        Files.setPosixFilePermissions(path, perms);
        log.debug("🔒 Permissions 700 définies pour {}", dirPath);
    }

    /**
     * Parse la sortie d'OpenSSL x509
     */
    private Map<String, String> parseCertificateInfo(String output) {
        Map<String, String> info = new HashMap<>();
        
        for (String line : output.split("\n")) {
            if (line.startsWith("subject=")) {
                info.put("subject", line.substring(8).trim());
            } else if (line.startsWith("issuer=")) {
                info.put("issuer", line.substring(7).trim());
            } else if (line.startsWith("notBefore=")) {
                info.put("notBefore", line.substring(10).trim());
            } else if (line.startsWith("notAfter=")) {
                info.put("notAfter", line.substring(9).trim());
            } else if (line.contains("Fingerprint=")) {
                info.put("fingerprint", line.split("=")[1].trim());
            }
        }
        
        return info;
    }

    /**
     * Vérifie qu'OpenSSL est disponible
     */
    public boolean isOpenSSLAvailable() {
        try {
            String version = executeOpenSSL(List.of("version"));
            log.info("✅ OpenSSL disponible : {}");
            return true;
        } catch (Exception e) {
            log.error("❌ OpenSSL non disponible : {}", e.getMessage());
            return false;
        }
    }
}