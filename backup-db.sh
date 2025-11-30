#!/bin/bash
# Script de sauvegarde de la base de données
# Usage: ./backup-db.sh [docker|manual]

BACKUP_DIR="/opt/backups/secret-santa"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

# Créer le répertoire de sauvegarde
mkdir -p $BACKUP_DIR

# Déterminer le mode (docker ou manuel)
MODE=${1:-docker}

if [ "$MODE" = "docker" ]; then
    # Sauvegarde avec Docker
    docker compose -f docker-compose.prod.yml exec -T db pg_dump -U secretsanta secretsanta > $BACKUP_DIR/backup_$DATE.sql
    echo "Sauvegarde Docker créée: backup_$DATE.sql"
elif [ "$MODE" = "manual" ]; then
    # Sauvegarde manuelle
    export PGPASSWORD=$(grep DB_PASSWORD .env | cut -d '=' -f2)
    pg_dump -h localhost -U secretsanta secretsanta > $BACKUP_DIR/backup_$DATE.sql
    echo "Sauvegarde manuelle créée: backup_$DATE.sql"
else
    echo "Usage: $0 [docker|manual]"
    exit 1
fi

# Compresser la sauvegarde
gzip $BACKUP_DIR/backup_$DATE.sql
echo "Sauvegarde compressée: backup_$DATE.sql.gz"

# Supprimer les anciennes sauvegardes (plus de X jours)
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete
echo "Anciennes sauvegardes supprimées (> $RETENTION_DAYS jours)"

echo "Sauvegarde terminée avec succès!"

