const Sproxy = require('sproxydclient');
const AWS = require('aws-sdk');
const https = require('https');

const DataFileBackend = require('./file/backend');
const inMemory = require('./in_memory/backend').backend;
const AwsClient = require('./external/AwsClient');
const AzureClient = require('./external/AzureClient');
const B2Client = require('./external/B2Client');

const { config } = require('../Config');

function parseLC() {
    const clients = {};

    Object.keys(config.locationConstraints).forEach(location => {
        const locationObj = config.locationConstraints[location];
        if (locationObj.type === 'mem') {
            clients[location] = inMemory;
        }
        if (locationObj.type === 'file') {
            clients[location] = new DataFileBackend();
        }
        if (locationObj.type === 'scality'
        && locationObj.details.connector.sproxyd) {
            clients[location] = new Sproxy({
                bootstrap: locationObj.details.connector
                    .sproxyd.bootstrap,
                // Might be undefined which is ok since there is a default
                // set in sproxydclient if chordCos is undefined
                chordCos: locationObj.details.connector.sproxyd.chordCos,
                // Might also be undefined, but there is a default path set
                // in sproxydclient as well
                path: locationObj.details.connector.sproxyd.path,
                // enable immutable optim for all objects
                immutable: true,
            });
            clients[location].clientType = 'scality';
        }
        if (locationObj.type === 'aws_s3') {
            const s3Params = {
                endpoint: `https://${locationObj.details.awsEndpoint}`,
                debug: false,
                // Not implemented yet for streams in node sdk,
                // and has no negative impact if stream, so let's
                // leave it in for future use
                computeChecksums: true,
                httpOptions: {
                    agent: new https.Agent({
                        keepAlive: true,
                    }),
                },
                // needed for encryption
                signatureVersion: 'v4',
            };
            // users can either include the desired profile name from their
            // ~/.aws/credentials file or include the accessKeyId and
            // secretAccessKey directly in the locationConfig
            if (locationObj.details.credentialsProfile) {
                s3Params.credentials = new AWS.SharedIniFileCredentials({
                    profile: locationObj.details.credentialsProfile });
            } else {
                s3Params.accessKeyId =
                    locationObj.details.credentials.accessKey;
                s3Params.secretAccessKey =
                    locationObj.details.credentials.secretKey;
            }
            clients[location] = new AwsClient({
                s3Params,
                awsBucketName: locationObj.details.bucketName,
                bucketMatch: locationObj.details.bucketMatch,
                serverSideEncryption: locationObj.details.serverSideEncryption,
                dataStoreName: location,
            });
            clients[location].clientType = 'aws_s3';
        }
        if (locationObj.type === 'azure') {
            const azureStorageEndpoint = config.getAzureEndpoint(location);
            const azureStorageCredentials =
                config.getAzureStorageCredentials(location);
            clients[location] = new AzureClient({
                azureStorageEndpoint,
                azureStorageCredentials,
                azureContainerName: locationObj.details.azureContainerName,
                bucketMatch: locationObj.details.bucketMatch,
                dataStoreName: location,
            });
            clients[location].clientType = 'azure';
        }
        if (locationObj.type === 'b2') {
            const b2StorageEndpoint = config.getB2Endpoint(location);
            const b2StorageCredentials =
                config.getB2StorageCredentials(location);
            clients[location] = new B2Client({
                b2StorageEndpoint,
                b2StorageCredentials,
                b2ContainerName: locationObj.details.b2ContainerName,
                bucketMatch: locationObj.details.bucketMatch,
                dataStoreName: location,
            });
            clients[location].clientType = 'b2';
        }
    });
    return clients;
}

module.exports = parseLC;
