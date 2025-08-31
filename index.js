const { WebSocketServer } = require("ws")

const http = require('http');
const fs = require('fs');
const path = require('path');
const PORT = process.env.PORT || 8000


const errorMessage = 'Error has occured'
/**
 * 
 * @param {String} query 
 * @returns {Object|null}
 */
function handleQuery(query) {
    try {
        if (query) {
            let newQuery;
            newQuery = JSON.parse(
                '{"' + decodeURIComponent(query)
                    .replace(/"/, '\'')
                    .replace(/=/g, '":"')
                    .replace(/&/g, '","') + '"}'
            );
            return newQuery;
        }
        else return null
    }
    catch {
        return null;
    }
}

const server = http.createServer((req, res) => {
    // console.log(req.url.match(/\/\d+/))
    // res.setHeader('Content-Security-Policy',
    //     "default-src 'self' ws:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' blob:")
    res.setHeader('Referrer-Policy', 'no-referrer, strict-origin');
    res.setHeader('X-Frame-Options', 'sameorigin');
    const url = req.url.match(/^\/([A-Z0-9-]*)/ig)[0];
    const originalUrl = req.url;
    let query = !req.url.match(/\?(.+)/) ? null : req.url.match(/\?(.+)/)[1];
    query = handleQuery(query);
    if (url === "/") {
        // res.setHeader('Content-Type', 'text/html');
        // const htmlFile = fs.readFileSync(path.resolve(__dirname, "views/roomChoosing.html"), 'utf8');
        // res.setHeader('Content-Length', htmlFile.length);
        // res.write(htmlFile);
        // res.end("");
        res.writeHead(302, {
            location: "/" + Date.now(),
        });
        res.end('')
    }
    else if (url.match(/\/\d+$/)) {
        const roomId = url.match(/\/(\d+)$/)[1];
        // const role = query['role'];
        res.setHeader('Content-Type', 'text/html');
        fs.createReadStream(path.resolve(__dirname, "views/index.html")).pipe(res);
    }
    else if (url.match(/^\/((?:script)|(?:style)|(?:images))$/)) {
        const filePath = originalUrl;
        // if (filePath.match(/(style)$/)) extension = ".css";
        // else if (filePath.match(/(script)$/)) extension = ".js";
        try {
            const file = fs.readFileSync(path.resolve(__dirname, `views` + filePath));
            if (filePath.match(/\.css$/)) res.setHeader('Content-Type', 'text/css');
            else if (filePath.match(/\.js$/)) res.setHeader('Content-Type', 'text/javascript');
            res.setHeader('Content-Length', file.length);
            res.write(file);
            res.end('');
        } catch (e) {
            console.log(e.message)
            res.setHeader('Content-Type', 'text/plain');
            res.setHeader('Content-Length', errorMessage.length);
            res.write(errorMessage);
            res.end('');
        }
    }
    else {
        res.setHeader('Content-Type', 'text/plain');
        res.write('Invalid, Error occured');
        res.end('');
    }
})
server.listen(PORT, '0.0.0.0', () => {
    console.log("Sever Started at", PORT)
})
const wss = new WebSocketServer({ server })

const users = {};


wss.on('connection', socket => {
    socket.on('message', data => {
        data = JSON.parse(Buffer.from(data).toString('utf8'));
        const type = data.type;
        console.log(users);
        switch (type) {
            case "join_create": {
                if (users[data['room']]) {
                    // room already exists
                    if (users[data['room']].others.length >= 2) {
                        // room is full
                        sendSocketMessage(socket, {
                            type: 'full_room',
                            message: "It's full"
                        });
                    }
                    else {
                        users[data['room']].others.push({
                            socket
                        });
                        users[data['room']].others.forEach(other => {
                            other.socket !== socket && sendSocketMessage(other.socket, {
                                type: 'another_joined',
                            })
                        })
                        sendSocketMessage(socket, {
                            type: 'i_joined'
                        })
                    }

                }
                else {
                    // new room
                    users[data['room']] = {
                        others: [{
                            socket,
                            isInitiator: true
                        }]
                    }
                    sendSocketMessage(socket, {
                        type: 'created',
                    })
                }
                break;
            }
            case 'cannot_get_user_media': {
                break;
            }
            case "disconnect": {
                removeUser(socket);
            }
            default:
                users[data['room']]?.others.forEach(other => {
                    other.socket !== socket && sendSocketMessage(other.socket, { ...data });
                });

        }
        console.log(data);


    });

    socket.on('close', (e) => {
        try {
            removeUser(socket);
        } catch (e) {
            console.log(e.message);
        }

    })
})

function stringifyData(data) {
    return JSON.stringify(data);
}
function removeUser(socket) {
    const ObjectToArray = Object.entries(users);
    const [room, usersInRoom] = ObjectToArray.find(o =>
        o[1]['others'] && o[1]['others'].find(other => other.socket === socket)
    )
    // if (usersInRoom['others'].find(other => other.socker === socket && other.isInitiator)) {
    //     delete users[room];
    // }
    const thisUser = usersInRoom['others'].find(other => other.socket === socket);
    if (thisUser) {
        const thisUserInDbIndex = usersInRoom['others'].findIndex(other => other.socket === socket)
        usersInRoom['others'].splice(thisUserInDbIndex, 1);
        if (usersInRoom['others'].length <= 0) {
            delete users[room];
        }
    }
}
/**
 * 
 * @param {WebSocket} socket 
 * @param {Object} data 
 */
function sendSocketMessage(socket, data) {
    socket.send(stringifyData(data));
}