dockerize -wait tcp://mysql:3308 -timeout 30s

echo "Start server"
yarn start:dev