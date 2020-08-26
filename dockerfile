FROM node
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
#RUN npm ci --only=production
COPY . .
EXPOSE 7777
CMD ["node", "App.js"].