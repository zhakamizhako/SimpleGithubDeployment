#!/bin/bash

echo "Executed!"
id=$1
name=$2
dockerRegion=$3

echo "ID:" $1
echo "Name:" $2
echo "region:" $3 

## for GCP:
#gcloud auth activate-service-account --key-file=creds.json
#cat creds.json | gcloud auth configure-docker us-east4-docker.pkg.dev --quiet

## for AWS
aws ecr get-login-password --region ap-southeast-2 | docker login --username AWS --password-stdin $3

# 1. Shut down the docker-compose modules with id
echo Stopping docker $id
docker compose stop $id

# 2. Remove the docker image with id
echo Removing docker image $id
docker rmi $id --force 

# echo Removing docker container $id
# #docker  container rm $id --force

echo pulling $name
# 3. Pull the docker image with name
docker pull $name

echo Tagging $name $id
# 4. Tag the docker image with id
docker tag $name $id

echo Deploying $id

docker compose up  -d $id

# 6. Return { Status: "ok" } else return the error details
if [ $? -eq 0 ]; then
  echo "{ Status: \"ok\" }"
else
  echo "{ Error: \"$(docker-compose -p $id logs)\" }"
fi
