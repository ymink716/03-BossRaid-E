FROM node:17.2.0-alpine

WORKDIR /boss-raid/
COPY ./package.json /boss-raid/
COPY ./yarn.lock /boss-raid/
RUN yarn install
COPY . /boss-raid/
CMD yarn start:dev