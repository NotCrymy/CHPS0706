FROM nginx:alpine
# Les fichiers de /etc/nginx/templates passent par envsubst au démarrage → /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY public /usr/share/nginx/html
