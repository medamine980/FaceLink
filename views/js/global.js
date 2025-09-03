const FLASH_MESSAGE_CLASS = 'flash-message';
const FLASH_MESSAGE_DISAPPEAR_CLASS = 'flash-message--disappear';
const FLASH_MESSAGE_TITLE_CLASS = 'flash-message__title';
const FLASH_MESSAGE_INFO_CLASS = 'flash-message__info';
const FLASH_MESSAGE_TRIANGLE = 'flash-message__triangle';

const TIME_TO_CLEAR_FLASH = 2000;
const ANIMATION_TIME_TO_CLEAR_FLASH = 1000;

/**
 * 
 * @param {"success" | "error"} type 
 * @param {string} title 
 * @param {string} message 
 */
function flashMessage(type, title, message) {
    let timeoutId1, timeoutId2;
    const containerDiv = document.createElement('div');
    const titleEle = document.createElement('h3');
    const paragraphEle = document.createElement('p');
    const triangleEle = document.createElement('div');
    triangleEle.classList.add(FLASH_MESSAGE_TRIANGLE);
    titleEle.textContent = title;
    paragraphEle.textContent = message;
    paragraphEle.classList.add(FLASH_MESSAGE_INFO_CLASS);
    titleEle.classList.add(FLASH_MESSAGE_TITLE_CLASS)
    containerDiv.classList.add(FLASH_MESSAGE_CLASS, `${FLASH_MESSAGE_CLASS}--${type}`);
    containerDiv.append(triangleEle, titleEle, paragraphEle);
    containerDiv.addEventListener('click', e => {
        e.stopImmediatePropagation();
        keepFlasMessage();
        disappearAnimation();
    });
    containerDiv.addEventListener('mouseenter', e => {
        keepFlasMessage();
    });
    containerDiv.addEventListener('mouseleave', e => {
        keepFlasMessage();
        delayedDisappearAnimation();
    });
    document.body.append(containerDiv);

    delayedDisappearAnimation();

    function delayedDisappearAnimation() {
        timeoutId1 = setTimeout(() => {
            disappearAnimation();
        }, TIME_TO_CLEAR_FLASH);
    }

    function disappearAnimation() {
        containerDiv.classList.add(FLASH_MESSAGE_DISAPPEAR_CLASS);
        timeoutId2 = setTimeout(() => {
            containerDiv.classList.add(FLASH_MESSAGE_DISAPPEAR_CLASS);
            containerDiv.remove();
            timeoutId2 = null;
        }, ANIMATION_TIME_TO_CLEAR_FLASH);
    }

    function keepFlasMessage() {
        if (timeoutId2 !== null) {
            clearTimeout(timeoutId1); clearTimeout(timeoutId2);
        }
    }
}