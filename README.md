# PKI-SOUVERAIN

Projet PKI complet avec:

- Frontend Web (React + TypeScript + Vite)
- Backend API (Spring Boot + JPA + Flyway)
- Base de donnees PostgreSQL
- Deploiement cloud Render

## 1. Organisation du projet

Ce depot est utilise avec deux branches principales:

- `frontend-web`: contient l'application web dans `frontend-web/`
- `main`: contient le backend Spring Boot dans `backend/`

## 2. Composants

### Frontend Web

- Dossier: `frontend-web/`
- Stack: React, TypeScript, Vite, Tailwind, Axios, Zustand
- Fonctions:
  - Authentification
  - Espace utilisateur (demandes, certificats, suivi)
  - Espace admin (gestion demandes, CA, CSR, CRL)
  - Theme clair/sombre

### Backend API

- Dossier: `backend/` (branche `main`)
- Stack: Spring Boot 3, Spring Security, JPA/Hibernate, Flyway, PostgreSQL
- Fonctions:
  - Auth/JWT
  - Workflow des demandes de certificats
  - Validation admin, approbation/rejet
  - Emission/revocation certificats
  - Endpoints admin/user

### Base de donnees

- PostgreSQL Render
- Migrations gerees par Flyway
- Tables principales:
  - `users`
  - `certificate_requests`
  - `certificates`
  - `audit_logs`
  - `ca_configuration`

## 3. Demarrage local

## Frontend

Dans `frontend-web/`:

```bash
npm ci
npm run dev
```

Build:

```bash
npm run build
```

## Backend

Dans `backend/` (branche `main`):

```bash
mvn clean package
mvn spring-boot:run
```

## 4. Variables d'environnement

## Frontend (Vite)

Exemple:

```env
VITE_API_BASE_URL=https://pki-backend.onrender.com/api
```

## Backend (Render)

Variables minimales:

```env
SPRING_DATASOURCE_URL=jdbc:postgresql://<host>:5432/<db>
SPRING_DATASOURCE_USERNAME=<user>
SPRING_DATASOURCE_PASSWORD=<password>
JWT_SECRET=<long_secret>
FRONTEND_URL=https://<frontend>.onrender.com
```

Variables utiles selon votre config:

```env
SPRING_JPA_HIBERNATE_DDL_AUTO=validate
SPRING_SERVLET_MULTIPART_MAX_FILE_SIZE=100MB
SPRING_SERVLET_MULTIPART_MAX_REQUEST_SIZE=100MB
PKI_UPLOAD_DIR=/var/data/uploads
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=<email>
SMTP_PASSWORD=<app_password>
```

## 5. Deploiement Render

## Frontend (Static Site)

- Branch: `frontend-web`
- Root Directory: `frontend-web`
- Build Command: `npm ci && npm run build`
- Publish Directory: `dist`
- Rewrites SPA: `/* -> /index.html`

## Backend (Web Service Docker)

- Branch: `main`
- Dockerfile Path: `backend/Dockerfile`
- Build Context: racine du repo (ou `backend` selon Dockerfile)
- Port: service Spring Boot sur `8080`

## 6. Flux fonctionnel (resume)

1. Utilisateur cree une demande
2. Upload des pieces justificatives
3. Verification par admin
4. Rejet (avec motif) ou approbation
5. Soumission/validation CSR
6. Signature et emission certificat
7. Consultation/telechargement cote utilisateur

## 7. Bonnes pratiques Git

- Ne pas commiter:
  - `node_modules/`
  - `dist/`
  - fichiers temporaires locaux
- Commits separes frontend/backend
- Verifier build avant push

## 8. Liens utiles

- Frontend Render: `https://certification-6397.onrender.com`
- Backend Render: `https://pki-backend.onrender.com`

