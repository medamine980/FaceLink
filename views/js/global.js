const FLASH_MESSAGE_CLASS = 'flash-message';
const FLASH_MESSAGE_DISAPPEAR_CLASS = 'flash-message--disappear';
const FLASH_MESSAGE_TITLE_CLASS = 'flash-message__title';
const FLASH_MESSAGE_INFO_CLASS = 'flash-message__info';

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
    titleEle.textContent = title;
    paragraphEle.textContent = message;
    paragraphEle.classList.add(FLASH_MESSAGE_INFO_CLASS);
    titleEle.classList.add(FLASH_MESSAGE_TITLE_CLASS)
    containerDiv.classList.add(FLASH_MESSAGE_CLASS, `${FLASH_MESSAGE_CLASS}--${type}`);
    containerDiv.append(titleEle, paragraphEle);
    containerDiv.addEventListener('click', e => {
        e.stopImmediatePropagation();
        clearTimeout(timeoutId1); clearTimeout(timeoutId2);
        disapearAnimation();
    });
    document.body.append(containerDiv);
    timeoutId1 = setTimeout(() => {
        disapearAnimation();
    }, TIME_TO_CLEAR_FLASH);

    const disapearAnimation = () => {
        containerDiv.classList.add(FLASH_MESSAGE_DISAPPEAR_CLASS);
        timeoutId2 = setTimeout(() => {
            containerDiv.classList.add(FLASH_MESSAGE_DISAPPEAR_CLASS);
            containerDiv.remove();
        }, ANIMATION_TIME_TO_CLEAR_FLASH);
    }
}