FROM mcr.microsoft.com/playwright:latest

ENV DOCKER_PLAYWRIGHT=1

WORKDIR /test
COPY . .
RUN yarn install --frozen-lockfile

CMD ["yarn", "test"]