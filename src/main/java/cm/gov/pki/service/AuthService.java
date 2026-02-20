package cm.gov.pki.service;

import cm.gov.pki.dto.AuthDTO;
import cm.gov.pki.entity.User;
import cm.gov.pki.repository.UserRepository;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Date;
import java.util.UUID;

/**
 * Service d'authentification et gestion JWT
 */
@Service
public class AuthService {

    private final UserRepository userRepository;
    private final AuditService auditService;
    private final EmailService emailService;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder(12);

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    @Autowired
    public AuthService(UserRepository userRepository, AuditService auditService, EmailService emailService) {
        this.userRepository = userRepository;
        this.auditService = auditService;
        this.emailService = emailService;
    }

    @Value("${pki.jwt.secret}")
    private String jwtSecret;

    @Value("${pki.jwt.expiration}")
    private Long jwtExpiration;

    @Value("${pki.jwt.refresh-expiration}")
    private Long refreshExpiration;

    /**
     * Inscription d'un nouvel utilisateur
     */
    @Transactional
    public AuthDTO.UserDTO register(AuthDTO.RegisterRequest request) {
        log.info("📝 Inscription utilisateur : {}");

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Cet email est déjà utilisé");
        }

        User user = User.builder()
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .role(User.UserRole.USER)  // Par défaut USER
                .isActive(true)
                .emailVerified(true)  // Automatiquement vérifiéà l'inscription
                .build();

        user = userRepository.save(user);

        auditService.log(user, "USER_REGISTER", "User", user.getId(), null);

        log.info("✅ Utilisateur créé : {}");

        return mapToDTO(user);
    }

    /**
     * Connexion utilisateur
     */
    @Transactional
    public AuthDTO.JwtResponse login(AuthDTO.LoginRequest request) {
        log.info("🔑 Tentative de connexion : {}");

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Email ou mot de passe invalide"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new RuntimeException("Email ou mot de passe invalide");
        }

        if (!user.canLogin()) {
            throw new RuntimeException("Compte inactif ou email non vérifié");
        }

        // Mise à jour last login
        user.setLastLogin(LocalDateTime.now());
        userRepository.save(user);

        auditService.log(user, "USER_LOGIN", "User", user.getId(), null);

        String accessToken = generateAccessToken(user);
        String refreshToken = generateRefreshToken(user);

        log.info("✅ Connexion réussie : {}");

        AuthDTO.JwtResponse jwt = new AuthDTO.JwtResponse();
        jwt.setAccessToken(accessToken);
        jwt.setRefreshToken(refreshToken);
        jwt.setTokenType("Bearer");
        jwt.setExpiresIn(jwtExpiration);
        jwt.setUser(mapToDTO(user));
        return jwt;
    }

    /**
     * Génère un Access Token JWT
     */
    private String generateAccessToken(User user) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpiration);

        return Jwts.builder()
                .subject(user.getId().toString())
                .claim("email", user.getEmail())
                .claim("role", user.getRole().name())
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(getSigningKey())
                .compact();
    }

    /**
     * Génère un Refresh Token JWT
     */
    private String generateRefreshToken(User user) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + refreshExpiration);

        return Jwts.builder()
                .subject(user.getId().toString())
                .claim("type", "refresh")
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(getSigningKey())
                .compact();
    }

    /**
     * Valide et parse un token JWT
     */
    public Claims validateToken(String token) {
        try {
            return Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (ExpiredJwtException e) {
            throw new RuntimeException("Token expiré");
        } catch (JwtException e) {
            throw new RuntimeException("Token invalide");
        }
    }

    /**
     * Récupère l'utilisateur depuis un token
     */
    public User getUserFromToken(String token) {
        Claims claims = validateToken(token);
        Object type = claims.get("type");
        if (type != null && "refresh".equalsIgnoreCase(type.toString())) {
            throw new RuntimeException("Refresh token non autorisé pour l'accès");
        }
        UUID userId = UUID.fromString(claims.getSubject());
        return userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
    }

    /**
     * Clé de signature JWT
     */
    private SecretKey getSigningKey() {
        byte[] keyBytes = jwtSecret.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    /**
     * Demande de réinitialisation de mot de passe
     */
    @Transactional
    public void requestPasswordReset(String email) {
        log.info("Demande de réinitialisation du mot de passe pour: {}", email);
        
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

        String resetToken = UUID.randomUUID().toString();
        LocalDateTime expiresAt = LocalDateTime.now().plusHours(24);

        user.setPasswordResetToken(resetToken);
        user.setPasswordResetTokenExpiresAt(expiresAt);
        userRepository.save(user);

        emailService.sendPasswordResetEmail(email, user.getFirstName(), resetToken);
        log.info("Email de réinitialisation envoyé à: {}", email);
    }

    /**
     * Réinitialise le mot de passe avec un token
     */
    @Transactional
    public void resetPassword(String resetToken, String newPassword) {
        log.info("Tentative de réinitialisation du mot de passe avec token");

        User user = userRepository.findByPasswordResetToken(resetToken)
                .orElseThrow(() -> new RuntimeException("Token invalide ou expiré"));

        // Vérifier l'expiration du token
        if (user.getPasswordResetTokenExpiresAt() == null || 
            LocalDateTime.now().isAfter(user.getPasswordResetTokenExpiresAt())) {
            throw new RuntimeException("Token expiré");
        }

        // Mettre à jour le mot de passe
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setPasswordResetToken(null);
        user.setPasswordResetTokenExpiresAt(null);
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        // Envoyer un email de confirmation
        emailService.sendPasswordResetConfirmationEmail(user.getEmail(), user.getFirstName());

        log.info("Mot de passe réinitialisé avec succès pour: {}", user.getEmail());
    }

    /**
     * Convertit User en DTO
     */
    private AuthDTO.UserDTO mapToDTO(User user) {
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
        return dto;
    }
}
