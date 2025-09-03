/**
 * @type {HTMLInputElement}
 */
const newRoomIdInput = document.querySelector("[data-new-room-id-input]");
/**
 * @type {HTMLInputElement}
 */
const roomIdInput = document.querySelector("[data-room-id-input]");

/**
 * @type {HTMLFormElement}
 */
const formNewRoom = document.querySelector("[data-new-room-form]");
/**
 * @type {HTMLFormElement}
 */
const formRoom = document.querySelector("[data-room-form]");

/**
 * @type {HTMLButtonElement}
 */
const copyToClipboardBtn = document.querySelector("[data-copy-to-clipboard]");

newRoomIdInput.value = Date.now().toString();

formNewRoom.addEventListener('submit', e => {
    e.preventDefault();
    const roomId = newRoomIdInput.value.trim();
    if (roomId === '') {
        window.location.reload();
    }
    window.location.assign(`/call?id=${roomId}`);
});

formRoom.addEventListener('submit', e => {
    e.preventDefault();
    const roomId = roomIdInput.value.trim();
    if (roomId === '') {
        flashMessage('error', 'Invalid Room ID', 'Please enter the room ID !')
        return;
    }
    if (isNaN(Number(roomId))) {
        flashMessage('error', 'Invalid Room ID', 'Please enter a valid room ID !');
        return;
    }
    window.location.assign(`/call?id=${roomId}`);
});

copyToClipboardBtn.addEventListener('click', async () => {
    const roomId = newRoomIdInput.value.trim();
    try {
        await navigator.clipboard.writeText(roomId);
        flashMessage('success', 'Success', 'Copied to clipboard successfuly')
    } catch (e) {
        flashMessage('error', 'Error', e.message);
    }
});