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
const videoToggler = document.getElementById('video-toggler');
const audioToggler = document.getElementById('audio-toggler');
const messageForm = document.getElementById("form-message");
const messagesBoxEle = document.getElementsByClassName("message-box__messages")[0];


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


//Initialize turn/stun server here

const localStreamConstraints = {
    video: true,
    audio: true
}

const ws = new WebSocket("wss" ? window.location.protocol === "https:" : "ws" + "://" + window.location.host);


function sendSocket(data) {
    data = JSON.stringify({ ...data, room: ROOM });
    ws.send(data);

}

document.getElementById("id").value = window.location.origin + "/" + ROOM;
document.querySelectorAll(".copy-to-clipboard").forEach(ele => {
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
            })
        // ws.close();
    };
    await getStreamData();
    messageForm.onsubmit = e => {
        e.preventDefault();
        if (!dc) return
        const inputEle = messageForm['message-box__input'];
        if (inputEle.value) {
            dc.send(JSON.stringify({
                data: inputEle.value.trim()
            }));
            handleMessages(dc.label, inputEle.value.trim());
            inputEle.value = "";
        }
    }
});
ws.addEventListener('message', async ({ data }) => {
    data = JSON.parse(data);
    const type = data.type;
    switch (type) {
        case 'created':
            isInitiator = true;
            console.log('isInitiator');
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
                console.log("full")
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
})
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

        };
        pc.ondatachannel = e => {
            console.log('ondatachannel')
        };
        dc.onmessage = msgEvent => {
            const { data } = JSON.parse(msgEvent.data);
            handleMessages(dc.label, data, false);
        };
        dc.onerror = console.log
        doCall();
    }
    else {
        pc.ondatachannel = e => {
            console.log('ondatachannel');
            dc = e.channel;
            dc.onmessage = msgEvent => {
                const { data } = JSON.parse(msgEvent.data);
                handleMessages(dc.label, data, false);
            }
            dc.onerror = console.log
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
            const li = document.createElement("li");
            li.append(message);
            li.classList.add("message-box__message");
            isMine ?
                li.classList.add("message-box__message--right")
                : li.classList.add("message-box__message--left");
            messagesBoxEle.append(li);
            break;
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

function closePeerConnection() {
    if (pc) {
        pc.getTransceivers().forEach(transceiver => transceiver.stop());
        pc.close();
    }
    if (dc) dc.close();
    pc = null;
    dc = null;
}

/**
 * 
 * @returns {Promise<MediaStream>}
 */
function getStreamData() {
    return new Promise(async res => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: {
                        ideal: ['user', 'environment']
                    }
                }
            });
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
                toggleVideo();
            });
            audioToggler.addEventListener('click', e => {
                toggleAudio();
            })
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
function toggleVideo() {
    if (localStream)
        localStream.getVideoTracks().forEach(track => track.enabled = !track.enabled)
}
function toggleAudio() {
    if (localStream)
        localStream.getAudioTracks().forEach(track => track.enabled = !track.enabled)
}
function removeStreamFromMediaElement(videoElement) {
    videoElement.srcObject = null;
}