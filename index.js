'use strict';

const Hapi = require('@hapi/hapi');
const Joi = require('@hapi/joi');
const fs = require('fs');
const path = require('path');
const { v4 } = require('uuid');
const IteratorWithFilter = require('./iterator-with-filter')

const FILE_NAME = 'data.json';

const init = async () => {
    const filePath = path.join(process.cwd(), FILE_NAME);
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '{}', { encoding: "utf-8" });
    }
    
    const readData = () => JSON.parse(fs.readFileSync(filePath, { encoding: "utf-8" }).toString());
    const writeData = (data) => fs.writeFileSync(filePath, JSON.stringify(data, null, '  '), { encoding: "utf-8"})

    const server = Hapi.server({
        port: 3000,
        host: 'localhost'
    });

    await server.route({
        method: 'GET',
        path: '/data',
        handler: (request, h) => {
            const { name, surname } = request.query;
            
            let data = Object.values(readData());

            if (name || surname) {
                data = data.filter(item => (!name || item.name === name) && (!surname || item.surname === surname))
            }

            return data;
        }
    })

    await server.route({
        method: 'GET',
        path: '/data/{itemId}',
        handler: (request, reply) => {
            const itemId = request.params.itemId;
            
            const data = readData();
            if (!data[itemId]) {
                return reply.response(`no item with id ${itemId}`).code(404);
            }

            return data[itemId];
        }
    })

    await server.route({
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
    
    await server.route({
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

    await server.route({
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

    await server.route({
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

    await server.start();
    console.log('Server running on %s', server.info.uri);
};

process.on('unhandledRejection', (err) => {

    console.log(err);
    process.exit(1);
});

init();
