/**
 * @type {RTCPeerConnection}
 */
let pc;
/**
 * @type {RTCDataChannel}
 */
let dc;
let callerAndCalleeHere;
/**
 * @type {MediaStream}
 */
let localStream;
let offer;
let isStarted = false;
let isInitiator = false;
let otherPeerConnected = false;
let offerSent;
// Elements
const videosContainerEle = document.querySelector('[data-videos]');
const videoToggler = document.getElementById('video-toggler');
const audioToggler = document.getElementById('audio-toggler');
const messageToggler = document.querySelector("[data-message-toggler]");
const leaveCallEle = document.querySelector("[data-leave-call]");
const messageForm = document.getElementById("form-message");
/**
 * @type {HTMLInputElement}
 */
const messageInputEle = document.querySelector("[name='message-box__input']");
const messageSendBtn = document.querySelector("[data-send-message-btn]");
const messagesBoxEle = document.querySelector("[data-messages-list]");
const messageContainerEle = document.querySelector("[data-message-container]");




/**
 * @constant localVideoEle @type {HTMLMediaElement}
 */
const localVideoEle = document.getElementById('local-video');
/**
 * @constant remoteVideoEle @type {HTMLMediaElement}
 */
const remoteVideoEle = document.getElementById('remote-video');

const CONSTRAINTS = {
    video: true,
    audio: true
}
const ROOM = window.location.pathname.replace(/^\//, "");
const VIDEO_COLUMN_CLASS = 'videos--column';
const OFF_DANGER_TOGGLER_STATE_CLASS = "controllers__toggler--danger--active";
const OFF_INFO_TOGGLER_STATE_CLASS = "controllers__toggler--info--active";
const INVISIBLE_MESSAGE_CONTAINER_CLASS = 'message-container--invisible';

const LEFT_MESSAGE_CLASS = 'message-container__message-box__messages__message--left';
const RIGHT_MESSAGE_CLASS = 'message-container__message-box__messages__message--right';
const MIDDLE_MESSAGE_CLASS = 'message-container__message-box__messages__message--middle';
const MESSAGE_ITEM_CLASS = 'message-container__message-box__messages__message';

//Initialize turn/stun server here

const localStreamConstraints = {
    video: true,
    audio: true
}

const ws = new WebSocket((window.location.protocol === "https:" ? "wss" : "ws") + "://" + window.location.host);


function sendSocket(data) {
    data = JSON.stringify({ ...data, room: ROOM });
    ws.send(data);

}

document.getElementById("id").value = window.location.origin + "/" + ROOM;
document.querySelectorAll("[data-clipboard-btn]").forEach(ele => {
    ele.addEventListener('click', e => {
        e.target.previousElementSibling.select();
        document.execCommand('copy');
        e.target.previousElementSibling.setSelectionRange(0, 0);
    })
})
ws.addEventListener('open', async e => {
    window.onbeforeunload = () => {
        if (ws.readyState === 1)
            sendSocket({
                type: "close",
            });
        // ws.close();
    };
    await getStreamData();
    messageForm.onsubmit = e => {
        e.preventDefault();
        if (!dc) return;
        if (messageInputEle.value) {
            dc.send(JSON.stringify({
                data: messageInputEle.value.trim()
            }));
            handleMessages(dc.label, messageInputEle.value.trim());
            messageInputEle.value = "";
        }
    }
});
ws.addEventListener('message', async ({ data }) => {
    data = JSON.parse(data);
    const type = data.type;
    switch (type) {
        case 'created':
            isInitiator = true;
            break;
        case 'i_joined':
            break;
        case 'another_joined':
            // another peer just joined
            otherPeerConnected = true;
            createPeerConnection();
            break;
        // case 'user_media_ready':
        //     createPeerConnection();
        //     break;
        case 'full_room':
            if (localStream) {
                localStream.getTracks().forEach(track => {
                    track.stop();
                })
                removeStreamFromMediaElement(localStream);
            }
        case 'candidate':
            if (!pc) break;
            const candidate = new RTCIceCandidate(data.candidate);
            pc.addIceCandidate(candidate);
            break;
        case 'answer':
            pc.setRemoteDescription(data.answer);
            break;
        case 'offer':
            createPeerConnection();
            await pc.setRemoteDescription(data.offer);
            await doAnswer();
            break
        case 'disconnect':
        case 'close':
            isInitiator = true;
            closePeerConnection();
            removeStreamFromMediaElement(remoteVideoEle);
            break;
    }
});

function createPeerConnection() {
    pc = new RTCPeerConnection(
    );

    localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
    });
    pc.ontrack = handleAddedTrack;
    pc.onicecandidate = handleIceCandidate;
    // pc.onnegotiationneeded = console.log
    // gets called when DataChannel is opened
    if (isInitiator) {
        /*** @type {RTCDataChannel}  */
        dc = pc.createDataChannel('message_channel', { ordered: true, maxPacketLifeTime: 5000 });
        dc.onopen = e => {
            handleUserConnectionStateMessage('User has connected');
        };
        dc.onclose = () => handleUserConnectionStateMessage('User has disconnected');
        pc.ondatachannel = e => {
            // console.log('ondatachannel')
        };
        dc.onmessage = msgEvent => {
            const { data } = JSON.parse(msgEvent.data);
            handleMessages(dc.label, data, false);
        };
        dc.onerror = console.log
        doCall();
    }
    else {
        pc.onopen = e => {
            console.dir(e);
        }
        pc.ondatachannel = e => {
            dc = e.channel;
            dc.onopen = () => handleUserConnectionStateMessage('User is connected');
            dc.onmessage = msgEvent => {
                const { data } = JSON.parse(msgEvent.data);
                handleMessages(dc.label, data, false);
            }
            dc.onerror = console.log;
            dc.onclose = () => handleUserConnectionStateMessage('User has disconnected');
        }

    }
}
/**
 * 
 * @param {RTCTrackEvent} e 
 */
function handleAddedTrack(e) {
    e.track.onunmute = unMuteEvent => {
        // console.log(unMuteEvent);
        pc.getStats(null).then(stats => {
            // stats.forEach(console.log)
        });
        if (remoteVideoEle.srcObject) return;
        remoteVideoEle.srcObject = e.streams[0];
    }
    e.track.onmute = muteEvent => {
        // console.log(muteEvent);
    }

}

function handleMessages(label, message, isMine = true) {
    switch (label) {
        case "message_channel":
            {
                const li = document.createElement("li");
                li.append(message);
                li.classList.add(MESSAGE_ITEM_CLASS);
                isMine ?
                    li.classList.add(RIGHT_MESSAGE_CLASS)
                    : li.classList.add(LEFT_MESSAGE_CLASS);
                messagesBoxEle.append(li);
                break;
            }
        case "info_channel": {
            const li = document.createElement("li");
            li.append(message);
            li.classList.add(MESSAGE_ITEM_CLASS);
            li.classList.add(MIDDLE_MESSAGE_CLASS);
            messagesBoxEle.append(li);
            break;
        }
    }
}
/**
 * 
 * @param {RTCPeerConnectionIceEvent} e 
 */
function handleIceCandidate(e) {
    if (e.candidate) {
        // sendSocket({
        //     type: "candidate",
        //     candidate: e.candidate.candidate,
        //     sdpMLineIndex: e.candidate.sdpMLineIndex,
        //     sdpMid: e.candidate.sdpMid
        // })

        sendSocket({
            type: "candidate",
            candidate: e.candidate,
        })
    }


}
async function doCall() {
    return new Promise(async res => {
        offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true
        });
        await pc.setLocalDescription(offer);
        if (otherPeerConnected) sendSocket({ type: 'offer', offer });
        res(offer);
    });
}

async function doAnswer() {
    const answer = await pc.createAnswer({

    });
    await pc.setLocalDescription(answer);
    sendSocket({ type: "answer", answer });

    return new Promise(res => res(answer));
}

function handleUserConnectionStateMessage(message) {
    handleMessages('info_channel', message);
}

function closePeerConnection() {
    if (pc) {
        pc.getTransceivers().forEach(transceiver => transceiver.stop());
        pc.close();
    }
    if (dc) dc.close();
    pc = null;
    dc = null;
}

messageInputEle.addEventListener('input', () => {
    const value = messageInputEle.value.trim();
    if (value === "") {
        messageSendBtn.disabled = true;
    } else {
        messageSendBtn.disabled = false;
    }
})

messageToggler.addEventListener('click', () => {
    messageContainerEle.classList.toggle(INVISIBLE_MESSAGE_CONTAINER_CLASS);
    messageToggler.classList.toggle(OFF_INFO_TOGGLER_STATE_CLASS);
    videosContainerEle.classList.toggle(VIDEO_COLUMN_CLASS);
});

leaveCallEle.addEventListener('click', () => {
    // pc.close();
    // sendSocket({
    //     type: "close",
    // });
    this.window.location.href = '/';
});

/**
 * 
 * @returns {Promise<MediaStream>}
 */
function getStreamData() {
    return new Promise(async res => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia(CONSTRAINTS);
            localStream = stream;
            localVideoEle.srcObject = stream;
            localStream.getVideoTracks()[0].onended = e => {
                sendSocket({
                    type: "disconnect"
                });
            };
            sendSocket({
                type: "join_create",
            });
            videoToggler.addEventListener('click', e => {
                toggleVideo(videoToggler);
            });
            audioToggler.addEventListener('click', e => {
                toggleAudio(audioToggler);
            });
            res(stream);
        } catch (e) {
            console.log(e.message)
            sendSocket({
                type: 'user_media_error',
                message: e.message || ''
            });
        }
    })
}
function toggleVideo(element) {
    if (localStream) {
        let isEnabled;
        localStream.getVideoTracks().forEach(track => isEnabled = track.enabled = !track.enabled);
        isEnabled ? element.classList.remove(OFF_DANGER_TOGGLER_STATE_CLASS) :
            element.classList.add(OFF_DANGER_TOGGLER_STATE_CLASS);
    }
}
function toggleAudio(element) {
    if (localStream) {
        let isEnabled;
        localStream.getAudioTracks().forEach(track => isEnabled = track.enabled = !track.enabled)
        isEnabled ? element.classList.remove(OFF_DANGER_TOGGLER_STATE_CLASS) :
            element.classList.add(OFF_DANGER_TOGGLER_STATE_CLASS);
    }
}
function removeStreamFromMediaElement(videoElement) {
    videoElement.srcObject = null;
}