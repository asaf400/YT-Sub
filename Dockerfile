FROM node:15-alpine

WORKDIR /app

ADD package.json ./

RUN npm i

ADD . ./

ENTRYPOINT /usr/local/bin/npm start
