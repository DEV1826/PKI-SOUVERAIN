package cm.gov.pki.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Service pour l'envoi d'emails de validation de tokens
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:support@pki-souverain.gov.cm}")
    private String fromEmail;

    @Value("${pki.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    @Value("${pki.email.debug-mode:false}")
    private boolean debugMode;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    /**
     * Envoie ou affiche un email en mode debug
     */
    private void sendOrLog(SimpleMailMessage message) {
        try {
            if (debugMode) {
                log.info("\n" +
                    "╔════════════════════════════════════════════════════════════════╗\n" +
                    "║                    📧 MODE DEBUG - EMAIL                       ║\n" +
                    "╚════════════════════════════════════════════════════════════════╝\n" +
                    "De: {}\n" +
                    "À: {}\n" +
                    "Sujet: {}\n" +
                    "─────────────────────────────────────────────────────────────────\n" +
                    "{}\n" +
                    "─────────────────────────────────────────────────────────────────",
                    message.getFrom(),
                    String.join(", ", message.getTo()),
                    message.getSubject(),
                    message.getText()
                );
            } else {
                mailSender.send(message);
            }
        } catch (Exception e) {
            log.error("Erreur lors de l'envoi/affichage de l'email", e);
        }
    }

    /**
     * Envoie un email avec le token de validation à un utilisateur
     *
     * @param toEmail        Email du destinataire
     * @param userName       Nom de l'utilisateur
     * @param requestId      ID de la demande
     * @param validationToken Token de validation
     */
    public void sendValidationTokenEmail(String toEmail, String userName, UUID requestId, String validationToken) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("Votre certificat numérique - Jeton de validation");
            
            String validationLink = String.format(
                "%s/validate-token?requestId=%s&token=%s",
                frontendUrl,
                requestId,
                validationToken
            );
            
            String messageBody = String.format(
                "Bonjour %s,\n\n" +
                "Votre demande de certificat numérique a été approuvée.\n\n" +
                "Pour finaliser et télécharger votre certificat, veuillez utiliser le lien ci-dessous :\n\n" +
                "%s\n\n" +
                "Ce lien expire dans 24 heures.\n\n" +
                "Si vous n'avez pas demandé de certificat, merci de contacter notre support.\n\n" +
                "Cordialement,\n" +
                "Autorité de Certification Souveraine",
                userName,
                validationLink
            );
            
            message.setText(messageBody);
            
            sendOrLog(message);
            if (!debugMode) {
                log.info("Email de validation envoyé avec succès à: {}", toEmail);
            }
            
        } catch (Exception e) {
            log.error("Erreur lors de l'envoi de l'email de validation à {}: {}", toEmail, e.getMessage(), e);
            // Ne pas lever l'exception pour ne pas bloquer le workflow
            // L'admin peut renvoyer l'email manuellement si besoin
        }
    }

    /**
     * Envoie un email de rejet de demande
     *
     * @param toEmail       Email du destinataire
     * @param userName      Nom de l'utilisateur
     * @param rejectionReason Raison du rejet
     */
    public void sendRejectionEmail(String toEmail, String userName, String rejectionReason) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("Demande de certificat numérique - Rejet");
            
            String messageBody = String.format(
                "Bonjour %s,\n\n" +
                "Malheureusement, votre demande de certificat numérique a été rejetée.\n\n" +
                "Raison : %s\n\n" +
                "Vous pouvez soumettre une nouvelle demande après avoir résolu les problèmes identifiés.\n\n" +
                "Pour toute question, veuillez contacter notre support.\n\n" +
                "Cordialement,\n" +
                "Autorité de Certification Souveraine",
                userName,
                rejectionReason != null && !rejectionReason.isBlank() ? rejectionReason : "Non spécifiée"
            );
            
            message.setText(messageBody);
            
            sendOrLog(message);
            if (!debugMode) {
                log.info("Email de rejet envoyé avec succès à: {}", toEmail);
            }
            
        } catch (Exception e) {
            log.error("Erreur lors de l'envoi de l'email de rejet à {}: {}", toEmail, e.getMessage(), e);
        }
    }

    /**
     * Envoie un email avec un lien de réinitialisation de mot de passe
     *
     * @param toEmail         Email du destinataire
     * @param userName        Nom de l'utilisateur
     * @param resetToken      Token de réinitialisation
     */
    public void sendPasswordResetEmail(String toEmail, String userName, String resetToken) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("Réinitialisation de votre mot de passe");
            
            String resetLink = String.format(
                "%s/reset-password?token=%s",
                frontendUrl,
                resetToken
            );
            
            String messageBody = String.format(
                "Bonjour %s,\n\n" +
                "Vous avez demandé la réinitialisation de votre mot de passe.\n\n" +
                "Veuillez cliquer sur le lien ci-dessous pour créer un nouveau mot de passe :\n\n" +
                "%s\n\n" +
                "Ce lien expire dans 24 heures.\n\n" +
                "Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email.\n\n" +
                "Cordialement,\n" +
                "Autorité de Certification Souveraine",
                userName,
                resetLink
            );
            
            message.setText(messageBody);
            
            sendOrLog(message);
            if (!debugMode) {
                log.info("Email de réinitialisation du mot de passe envoyé à: {}", toEmail);
            }
            
        } catch (Exception e) {
            log.error("Erreur lors de l'envoi de l'email de réinitialisation à {}: {}", toEmail, e.getMessage(), e);
        }
    }

    /**
     * Envoie un email de confirmation de réinitialisation de mot de passe réussie
     *
     * @param toEmail   Email du destinataire
     * @param userName  Nom de l'utilisateur
     */
    public void sendPasswordResetConfirmationEmail(String toEmail, String userName) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("Votre mot de passe a été réinitialisé");
            
            String messageBody = String.format(
                "Bonjour %s,\n\n" +
                "Votre mot de passe a été réinitialisé avec succès.\n\n" +
                "Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.\n\n" +
                "Si vous n'avez pas effectué cette modification, veuillez contacter notre support immédiatement.\n\n" +
                "Cordialement,\n" +
                "Autorité de Certification Souveraine",
                userName
            );
            
            message.setText(messageBody);
            
            sendOrLog(message);
            if (!debugMode) {
                log.info("Email de confirmation de réinitialisation envoyé à: {}", toEmail);
            }
            
        } catch (Exception e) {
            log.error("Erreur lors de l'envoi de l'email de confirmation à {}: {}", toEmail, e.getMessage(), e);
        }
    }
}
