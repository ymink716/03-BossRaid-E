FROM node:17.2.0-alpine

ENV DOCKERIZE_VERSION v0.2.0
RUN wget https://github.com/jwilder/dockerize/releases/download/$DOCKERIZE_VERSION/dockerize-linux-amd64-$DOCKERIZE_VERSION.tar.gz \  
    && tar -C /usr/local/bin -xzvf dockerize-linux-amd64-$DOCKERIZE_VERSION.tar.gz

WORKDIR /boss-raid
RUN apk update
RUN apk upgrade
RUN apk --no-cache add tzdata && \
        cp /usr/share/zoneinfo/Asia/Seoul /etc/localtime && \
        echo "Asia/Seoul" > /etc/timezone
        
COPY ./package.json /boss-raid/
COPY ./yarn.lock /boss-raid/
RUN yarn install

COPY . /boss-raid/

RUN chmod +x /boss-raid/docker-entrypoint.sh
ENTRYPOINT ./docker-entrypoint.sh

EXPOSE 3000