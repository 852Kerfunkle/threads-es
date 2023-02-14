# build app
FROM mcr.microsoft.com/playwright:v1.30.0-focal

ENV DOCKER_PLAYWRIGHT=1

WORKDIR /test
COPY . .
RUN yarn install

CMD ["yarn", "test"]