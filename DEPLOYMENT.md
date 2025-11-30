# Guide de déploiement sur Proxmox

Ce guide vous explique comment déployer l'application Secret Santa Manager sur un serveur Proxmox.

## Prérequis

- Un serveur Proxmox avec accès root/SSH
- Un domaine (optionnel, pour HTTPS)
- Accès à un serveur SMTP (Gmail, SendGrid, etc.)

## Option 1 : Déploiement avec Docker (Recommandé)

### Étape 1 : Préparer le serveur Proxmox

1. Créer une VM ou un conteneur LXC sur Proxmox
2. Installer Docker et Docker Compose :

```bash
# Sur Debian/Ubuntu
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Installer Docker Compose
apt-get update
apt-get install docker-compose-plugin -y
```

### Étape 2 : Cloner le projet

```bash
cd /opt
git clone <votre-repo> secret-santa
cd secret-santa
```

### Étape 3 : Configurer les variables d'environnement

Créez un fichier `.env` à la racine du projet :

```bash
cp .env.example .env
nano .env
```

Remplissez les variables suivantes (voir `.env.example` pour les détails) :

```env
# Base de données
DATABASE_URL="postgresql://secretsanta:VOTRE_MOT_DE_PASSE@db:5432/secretsanta"

# NextAuth
NEXTAUTH_URL="https://votre-domaine.com"
NEXTAUTH_SECRET="générez-une-clé-secrète-aléatoire-ici"

# SMTP (fallback si non configuré dans l'admin)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="votre-email@gmail.com"
SMTP_PASS="votre-mot-de-passe-app"
SMTP_SENDER="votre-email@gmail.com"

# Optionnel
NEXT_PUBLIC_BASE_URL="https://votre-domaine.com"
```

**Important** : Générez un `NEXTAUTH_SECRET` sécurisé :
```bash
openssl rand -base64 32
```

### Étape 4 : Modifier docker-compose.yml pour la production

Créez un fichier `docker-compose.prod.yml` :

```yaml
services:
  db:
    image: postgres:16
    restart: unless-stopped
    environment:
      POSTGRES_DB: secretsanta
      POSTGRES_USER: secretsanta
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - db_data:/var/lib/postgresql/data
    networks:
      - app-network

  web:
    build: .
    restart: unless-stopped
    depends_on:
      - db
    env_file:
      - .env
    ports:
      - "3000:3000"
    networks:
      - app-network
    command: sh -c "npx prisma migrate deploy && npm start"

volumes:
  db_data:

networks:
  app-network:
    driver: bridge
```

Ajoutez `DB_PASSWORD` dans votre `.env`.

### Étape 5 : Lancer l'application

```bash
# Construire et démarrer
docker compose -f docker-compose.prod.yml up -d

# Vérifier les logs
docker compose -f docker-compose.prod.yml logs -f

# Appliquer les migrations
docker compose -f docker-compose.prod.yml exec web npx prisma migrate deploy
```

### Étape 6 : Configurer Nginx (Reverse Proxy)

Installez Nginx :

```bash
apt-get update
apt-get install nginx certbot python3-certbot-nginx -y
```

Créez `/etc/nginx/sites-available/secret-santa` :

```nginx
server {
    listen 80;
    server_name votre-domaine.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Activez le site :

```bash
ln -s /etc/nginx/sites-available/secret-santa /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### Étape 7 : Configurer SSL avec Let's Encrypt

```bash
certbot --nginx -d votre-domaine.com
```

Certbot configurera automatiquement HTTPS.

## Option 2 : Déploiement manuel (sans Docker)

### Étape 1 : Installer les dépendances

```bash
# Installer Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Installer PostgreSQL
apt-get install postgresql postgresql-contrib -y
```

### Étape 2 : Configurer PostgreSQL

```bash
sudo -u postgres psql
```

Dans PostgreSQL :

```sql
CREATE DATABASE secretsanta;
CREATE USER secretsanta WITH PASSWORD 'VOTRE_MOT_DE_PASSE';
GRANT ALL PRIVILEGES ON DATABASE secretsanta TO secretsanta;
\q
```

### Étape 3 : Cloner et configurer l'application

```bash
cd /opt
git clone <votre-repo> secret-santa
cd secret-santa

# Installer les dépendances
npm install

# Configurer .env (voir Option 1, Étape 3)
cp .env.example .env
nano .env
```

Mettez à jour `DATABASE_URL` :
```
DATABASE_URL="postgresql://secretsanta:VOTRE_MOT_DE_PASSE@localhost:5432/secretsanta"
```

### Étape 4 : Construire et lancer

```bash
# Générer le client Prisma
npx prisma generate

# Appliquer les migrations
npx prisma migrate deploy

# Construire l'application
npm run build

# Lancer en production
NODE_ENV=production npm start
```

### Étape 5 : Configurer PM2 (Gestionnaire de processus)

```bash
npm install -g pm2

# Créer un fichier ecosystem.config.js
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'secret-santa',
    script: 'npm',
    args: 'start',
    cwd: '/opt/secret-santa',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    }
  }]
}
EOF

# Démarrer avec PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Étape 6 : Configurer Nginx et SSL

Suivez les étapes 6 et 7 de l'Option 1.

## Maintenance

### Sauvegardes de la base de données

Créez un script de sauvegarde `/opt/backup-db.sh` :

```bash
#!/bin/bash
BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Avec Docker
docker compose -f docker-compose.prod.yml exec -T db pg_dump -U secretsanta secretsanta > $BACKUP_DIR/backup_$DATE.sql

# Ou sans Docker
pg_dump -U secretsanta secretsanta > $BACKUP_DIR/backup_$DATE.sql

# Garder seulement les 7 derniers jours
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete
```

Rendez-le exécutable et ajoutez une tâche cron :

```bash
chmod +x /opt/backup-db.sh
crontab -e
# Ajouter : 0 2 * * * /opt/backup-db.sh
```

### Mises à jour

```bash
cd /opt/secret-santa

# Avec Docker
git pull
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml exec web npx prisma migrate deploy

# Sans Docker
git pull
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 restart secret-santa
```

### Logs

```bash
# Avec Docker
docker compose -f docker-compose.prod.yml logs -f web

# Avec PM2
pm2 logs secret-santa
```

## Sécurité

1. **Firewall** : Configurez un firewall (UFW) :
```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

2. **Mots de passe forts** : Utilisez des mots de passe forts pour PostgreSQL et les comptes admin.

3. **Variables d'environnement** : Ne commitez jamais le fichier `.env`.

4. **Mises à jour** : Maintenez le système à jour :
```bash
apt-get update && apt-get upgrade -y
```

## Dépannage

### L'application ne démarre pas

```bash
# Vérifier les logs
docker compose logs web
# ou
pm2 logs secret-santa

# Vérifier la connexion à la base de données
docker compose exec db psql -U secretsanta -d secretsanta
```

### Erreurs de migration Prisma

```bash
# Vérifier l'état des migrations
docker compose exec web npx prisma migrate status

# Réinitialiser (ATTENTION : perte de données)
docker compose exec web npx prisma migrate reset
```

### Problèmes de SMTP

Vérifiez que les variables SMTP dans `.env` sont correctes. Pour Gmail, utilisez un "Mot de passe d'application" au lieu du mot de passe normal.

## Support

En cas de problème, vérifiez :
1. Les logs de l'application
2. Les logs de Nginx : `tail -f /var/log/nginx/error.log`
3. Les logs système : `journalctl -u nginx` ou `journalctl -u docker`

