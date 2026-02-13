# Utilisation d'une image Node.js légère
FROM node:18-alpine

# Définition du dossier de travail
WORKDIR /app

# Copie du fichier de dépendances d'abord (pour mettre en cache les installations)
COPY package.json ./

# Installation des dépendances
RUN npm install

# Copie de tout le reste du code source
COPY . .

# Construction de l'application (Production mode)
RUN npm run build

# Exposition du port (Doit correspondre au port interne du docker-compose)
EXPOSE 3000

# Lancement du serveur de preview (mode production statique)
CMD ["npm", "run", "preview"]
