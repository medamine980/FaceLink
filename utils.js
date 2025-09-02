const fs = require('node:fs');
const { ServerResponse, IncomingMessage } = require('node:http');
const path = require('node:path');

/**
 * 
 * @param {string} path 
 * @param {ServerResponse<IncomingMessage>} response 
 */
function pipeFileContent(path, response) {
    fs.createReadStream(path).pipe(response);
}

/**
 * 
 * @param {string} path
 * @returns {NonSharedBuffer} 
 */
function readFile(path) {
    const file = fs.readFileSync(path);
    return file;
}

module.exports = {
    pipeFileContent,
    readFile
}