'use strict';

const Hapi = require('@hapi/hapi');
const Joi = require('@hapi/joi');
const fs = require('fs');
const path = require('path');
const { v4 } = require('uuid');

const FILE_NAME = 'data.json';
const AUTH_FILE_NAME = 'auth.json';
const AUTH_ERROR = 'fuck you';

const filePath = path.join(process.cwd(), FILE_NAME);
const authFilePath = path.join(process.cwd(), AUTH_FILE_NAME);
const readData = () => JSON.parse(fs.readFileSync(filePath, { encoding: "utf-8" }).toString());
const writeData = (data) => fs.writeFileSync(filePath, JSON.stringify(data, null, '  '), { encoding: "utf-8"})
const readAuth = () => JSON.parse(fs.readFileSync(authFilePath, { encoding: 'utf-8' }).toString());

const init = async () => {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '{}', { encoding: "utf-8" });
    }

    const server = Hapi.server({
        port: 3000,
        host: 'localhost'
    });

    server.route({
        method: 'GET',
        path: '/data',
        handler: (request, h) => {
            const { name, surname } = request.query;

            let data = Object.values(readData());

            if (name || surname) {
                data = data.filter(item => (!name || item.name === name) && (!surname || item.surname === surname))
            }

            return data;
        },
        options: {
            auth: false,
        }
    })

    server.route({
        method: 'GET',
        path: '/data/{itemId}',
        handler: (request, reply) => {
            const itemId = request.params.itemId;

            const data = readData();
            if (!data[itemId]) {
                return reply.response(`no item with id ${itemId}`).code(404);
            }

            return data[itemId];
        },
        options: {
            auth: false,
        }
    })

    server.route({
        method: 'PUT',
        path: '/data',
        handler: (request, reply) => {
            const item = request.payload;
            const data = readData();
            item.id = v4()

            data[item.id] = item;

            writeData(data)

            return reply.response().code(200);
        },
        options: {
            validate: {
                payload: Joi.object({
                    name: Joi.string().required(),
                    surname: Joi.string().required(),
                }),
            }
        }
    })

    server.route({
        method: 'POST',
        path: '/data/{itemId}',
        handler: (request, reply) => {
            const itemId = request.params.itemId;
            const data = readData();
            if (!data[itemId]) {
                return reply.response(`no item with id ${itemId}`).code(404);
            }

            const item = request.payload;

            item.id = itemId;

            data[itemId] = item;

            writeData(data);

            return reply.response().code(200);
        },
        options: {
            validate: {
                payload: Joi.object({
                    name: Joi.string().required(),
                    surname: Joi.string().required(),
                }),
            }
        }
    })

    server.route({
        method: 'PATCH',
        path: '/data/{itemId}',
        handler: (request, reply) => {
            const itemId = request.params.itemId;
            const data = readData();
            if (!data[itemId]) {
                return reply.response(`no item with id ${itemId}`).code(404);
            }
            const item = request.payload;

            item.id = itemId;

            data[itemId] = { ...data[itemId], ...item };

            writeData(data);

            return reply.response().code(200);
        },
        options: {
            validate: {
                payload: Joi.object({
                    name: Joi.string(),
                    surname: Joi.string(),
                }),
            }
        }
    })

    server.route({
        method: 'DELETE',
        path: '/data/{itemId}',
        handler: (request, reply) => {
            const itemId = request.params.itemId;
            const data = readData();
            if (!data[itemId]) {
                return reply.response(`no item with id ${itemId}`).code(404);
            }

            delete data[itemId];

            writeData(data);

            return reply.response().code(200);
        }
    })

    server.route({
        method: 'POST',
        path: '/auth',
        handler: (request, reply) => {
            const { username, password } = request.payload;
            const { returnUrl } = request.query;
            const authData = Object.values(readAuth());
            const user = authData.find(item => item.username === username);
            if (!user) {
                return reply.response(AUTH_ERROR).statusCode(401);
            }
            if (user.password !== password) {
                return reply.response(AUTH_ERROR).statusCode(401);
            }

            const replyResult = reply
                .state('userId', user.id, {
                    isHttpOnly: true,
                });

            if (returnUrl) {
                return replyResult.redirect(returnUrl);
            } else {
                return replyResult.response('Authorized').code(200);
            }
        },
        options: {
            validate: {
                payload: Joi.object({
                    username: Joi.string().required(),
                    password: Joi.string().required(),
                })
            },
        }
    });

    server.auth.scheme('custom-schema', (server, options) => {
        return {
            authenticate(request, reply) {
                const { userId } = request.state;
                if (auth) {
                    reply.authenticated({ credentials: { user: { id: userId }}});
                } else {
                    reply.unauthenticated(new Error(AUTH_ERROR));
                }
            }
        }
    });

    server.auth.strategy('default', 'custom-schema');
    server.auth.default('default');

    await server.start();
    console.log('Server running on %s', server.info.uri);
};

process.on('unhandledRejection', (err) => {

    console.log(err);
    process.exit(1);
});

init();
