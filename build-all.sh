docker build -t mailtester2/engine:headless .
docker build -t mailtester2/engine:master .
docker build -t mailtester2/engine:worker .
docker push mailtester2/engine:worker
docker push mailtester2/engine:master
docker push mailtester2/engine:headless