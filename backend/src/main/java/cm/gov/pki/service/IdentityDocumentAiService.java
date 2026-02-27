package cm.gov.pki.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Locale;
import java.util.Map;

@Service
public class IdentityDocumentAiService {

    private static final Logger log = LoggerFactory.getLogger(IdentityDocumentAiService.class);

    @Value("${pki.identity-ai.provider:heuristic}")
    private String provider;

    @Value("${pki.identity-ai.strict-mode:false}")
    private boolean strictMode;

    @Value("${pki.identity-ai.google.api-key:}")
    private String googleApiKey;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ValidationResult validateIdentityDocument(MultipartFile file, String expectedType) {
        String expected = expectedType == null ? "" : expectedType.trim().toUpperCase(Locale.ROOT);
        try {
            String text = extractText(file);
            ValidationResult classified = classify(file, text, expected);

            if (!classified.accepted && !strictMode) {
                // Mode souple: ne bloque pas l'utilisateur, mais garde la trace de confiance faible.
                return new ValidationResult(true, classified.confidence, "Validation IA faible (mode souple): " + classified.message);
            }
            return classified;
        } catch (Exception e) {
            log.warn("Identity AI validation failed: {}", e.getMessage());
            if (strictMode) {
                return new ValidationResult(false, 0.0, "Analyse IA impossible en mode strict");
            }
            return new ValidationResult(true, 0.0, "Analyse IA indisponible (mode souple)");
        }
    }

    private String extractText(MultipartFile file) {
        String providerValue = provider == null ? "heuristic" : provider.trim().toLowerCase(Locale.ROOT);
        String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
        if ("google".equals(providerValue)
                && !googleApiKey.isBlank()
                && contentType.startsWith("image/")) {
            String text = extractTextWithGoogleVision(file);
            if (text != null && !text.isBlank()) return text;
        }

        // Fallback local heuristique: extrait brut de texte (utile .txt/.pdf OCR text layer, noms de fichiers scannés).
        try {
            byte[] bytes = file.getBytes();
            int max = Math.min(bytes.length, 80_000);
            return new String(bytes, 0, max, StandardCharsets.UTF_8).toLowerCase(Locale.ROOT);
        } catch (Exception e) {
            return "";
        }
    }

    private String extractTextWithGoogleVision(MultipartFile file) {
        try {
            String b64 = Base64.getEncoder().encodeToString(file.getBytes());
            Map<String, Object> payload = Map.of(
                    "requests", new Object[]{
                            Map.of(
                                    "image", Map.of("content", b64),
                                    "features", new Object[]{Map.of("type", "TEXT_DETECTION", "maxResults", 1)}
                            )
                    }
            );

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);

            String url = "https://vision.googleapis.com/v1/images:annotate?key=" + googleApiKey;
            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);
            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) return "";

            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode textNode = root.path("responses").path(0).path("fullTextAnnotation").path("text");
            return textNode.isMissingNode() ? "" : textNode.asText("").toLowerCase(Locale.ROOT);
        } catch (Exception e) {
            log.warn("Google Vision OCR failed: {}", e.getMessage());
            return "";
        }
    }

    private ValidationResult classify(MultipartFile file, String text, String expectedType) {
        String fileName = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase(Locale.ROOT);
        String textLc = text == null ? "" : text.toLowerCase(Locale.ROOT);

        int cniScore = 0;
        int passportScore = 0;

        if (containsAny(fileName, "cni", "identite", "identity", "id_card", "national_id", "carte")) cniScore += 2;
        if (containsAny(textLc, "carte nationale", "carte d'identite", "national identity", "id card", "cni")) cniScore += 3;

        if (containsAny(fileName, "passport", "passeport", "mrz")) passportScore += 2;
        if (containsAny(textLc, "passport", "passeport", "travel document", "p<")) passportScore += 3;

        // Un peu de robustesse MRZ classique pour passeport
        if (textLc.contains("p<") && textLc.length() > 40) passportScore += 2;

        double cniConfidence = Math.min(1.0, cniScore / 6.0);
        double passportConfidence = Math.min(1.0, passportScore / 6.0);

        if ("CNI".equals(expectedType)) {
            if (cniScore >= 3) return new ValidationResult(true, cniConfidence, "CNI detectee");
            return new ValidationResult(false, cniConfidence, "Le document ne ressemble pas a une CNI");
        }

        if ("PASSEPORT".equals(expectedType)) {
            if (passportScore >= 3) return new ValidationResult(true, passportConfidence, "Passeport detecte");
            return new ValidationResult(false, passportConfidence, "Le document ne ressemble pas a un passeport");
        }

        int maxScore = Math.max(cniScore, passportScore);
        if (maxScore >= 3) {
            double conf = Math.max(cniConfidence, passportConfidence);
            String label = cniScore >= passportScore ? "CNI" : "PASSEPORT";
            return new ValidationResult(true, conf, "Document d'identite detecte: " + label);
        }
        return new ValidationResult(false, 0.0, "Document d'identite non detecte");
    }

    private boolean containsAny(String text, String... keys) {
        if (text == null || text.isBlank()) return false;
        for (String k : keys) {
            if (text.contains(k)) return true;
        }
        return false;
    }

    public record ValidationResult(boolean accepted, double confidence, String message) {}
}

