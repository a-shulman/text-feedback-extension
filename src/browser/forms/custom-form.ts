import {showPopup} from '../popup';
import {canSubmit, markSubmitted} from '../state';
import {buildYmGoalCall, sanitizeInput, sendData} from '../utils';
import {getFeedbackOptions} from '../config';

import {CustomFormSuggestionEnum} from './enums';

let formEl: HTMLDivElement | null = null;
let selectedText = '';

const COMMENT_MAX_LENGTH = 1000;
const CONTACT_MAX_LENGTH = 255;

const formStyles: Record<string, string> = {
    position: 'fixed',
    background: 'var(--g-color-base-background)',
    padding: '15px',
    border: '1px solid #ccc',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    zIndex: '10000',
    minWidth: '300px',
    maxWidth: '400px',
    maxHeight: 'calc(100vh - 20px)',
    overflowY: 'auto',
    display: 'none',
    touchAction: 'manipulation',
};

export function showSelectionForm(text: string): void {
    selectedText = text;

    if (!formEl) {
        formEl = createForm();
    }

    const textDisplay = formEl.querySelector('#selected-text-display') as HTMLElement | null;

    if (textDisplay) {
        textDisplay.textContent = `"${text.slice(0, 100)}${text.length > 100 ? '...' : ''}"`;
    }

    resetForm();

    // Show hidden first to measure actual rendered size before positioning
    formEl.style.visibility = 'hidden';
    formEl.style.display = 'block';
    positionForm();
    formEl.style.visibility = 'visible';
}

function createForm(): HTMLDivElement {
    const form = document.createElement('div');
    form.id = 'selection-feedback-form';
    Object.assign(form.style, formStyles);

    const {privacyPolicyUrl, metrika} = getFeedbackOptions();
    const cancelOnclick = buildYmGoalCall(metrika, 'cancel');
    const submitOnclick = buildYmGoalCall(metrika, 'submit');
    const consentHtml = privacyPolicyUrl
        ? `<label style="display: flex; align-items: flex-start; gap: 8px; font-size: 10px; margin: 6px 0 10px 0; cursor: pointer;">
            <input type="checkbox" id="personal-data-consent" style="margin-top: 2px; flex-shrink: 0;">
            <span>Я даю согласие на обработку персональных данных согласно
                <a href="${privacyPolicyUrl}" target="_blank" style="color: var(--g-color-base-brand); text-decoration: underline;">
                    политике обработки персональных данных</a>
            </span>
        </label>`
        : '';

    form.innerHTML = `
        <p style="margin: 0 0 10px 0; font-size: 12px; background: var(--g-color-base-background); padding: 8px;">
            <strong>Обратная связь к тексту:</strong>
            <span id="selected-text-display"></span>
        </p>

        <div style="margin: 0 0 15px 0;">
            <div style="font-size: 12px; font-weight: bold; margin-bottom: 8px;">Проблема:</div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                    <input type="radio" name="issue" value="typo" style="margin: 0;">
                    <span>Опечатка в тексте</span>
                </label>
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                    <input type="radio" name="issue" value="non_relevant" style="margin: 0;">
                    <span>Некорректная/неактуальная информация</span>
                </label>
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                    <input type="radio" name="issue" value="no_example" style="margin: 0;">
                    <span>Не хватает примера</span>
                </label>
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                    <input type="radio" name="issue" value="bad_graphics" style="margin: 0;">
                    <span>Низкое качество графики</span>
                </label>
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                    <input type="radio" name="issue" value="another" style="margin: 0;">
                    <span>Другое</span>
                </label>
            </div>
        </div>

        <textarea id="selection-comment" placeholder="Комментарий..."
                style="width: 100%; height: 80px; margin: 8px 0 4px 0; padding: 8px; border: 1px solid #ddd; border-radius: 4px; resize: vertical;"></textarea>
        <div id="comment-error" style="color: var(--g-color-base-brand); font-size: 12px; margin-bottom: 10px; min-height: 16px; display: none;"></div>
        <textarea id="selection-contact" placeholder="Контакт"
                style="width: 100%; height: 30px; margin: 8px 0 4px 0; padding: 8px; border: 1px solid #ddd; border-radius: 4px; resize: vertical;"></textarea>
        <div id="contact-error" style="color: var(--g-color-base-brand); font-size: 12px; margin-bottom: 10px; min-height: 16px; display: none;"></div>
        ${consentHtml}
        <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <button id="selection-cancel" type="button" class="g-button g-button_view_normal g-button_size_m g-button_pin_round-round"${cancelOnclick ? ` onclick="${cancelOnclick}"` : ''}>Отмена</button>
            <button id="selection-submit" type="button" class="g-button g-button_view_action g-button_size_m g-button_pin_round-round"${submitOnclick ? ` onclick="${submitOnclick}"` : ''}>Отправить</button>
        </div>
    `;

    form.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;

        if (target.id === 'selection-cancel' || target.closest('#selection-cancel')) {
            e.stopPropagation();
            hideForm();
        } else if (target.id === 'selection-submit' || target.closest('#selection-submit')) {
            e.stopPropagation();
            handleSubmit().catch((error) => {
                console.error('[TextFeedback] Unexpected error while submitting feedback:', error);
            });
        }
    });

    form.addEventListener('input', (e) => {
        const target = e.target as HTMLTextAreaElement;
        if (target.id === 'selection-comment') {
            const errorElement = form.querySelector<HTMLDivElement>('#comment-error');
            if (target.value.length > COMMENT_MAX_LENGTH) {
                target.style.borderColor = 'var(--g-color-base-brand)';
                if (errorElement) {
                    errorElement.textContent = `Максимальное количество символов в комментарии - ${COMMENT_MAX_LENGTH}`;
                    errorElement.style.display = 'block';
                }
            } else {
                target.style.borderColor = '#ddd';
                target.placeholder = 'Комментарий...';
                if (errorElement) {
                    errorElement.textContent = '';
                    errorElement.style.display = 'none';
                }
            }
        }
        if (target.id === 'selection-contact') {
            const errorElement = form.querySelector<HTMLDivElement>('#contact-error');
            if (target.value.length > CONTACT_MAX_LENGTH) {
                target.style.borderColor = 'var(--g-color-base-brand)';
                if (errorElement) {
                    errorElement.textContent = `Максимальное количество символов в контакте - ${CONTACT_MAX_LENGTH}`;
                    errorElement.style.display = 'block';
                }
            } else {
                target.style.borderColor = '#ddd';
                if (errorElement) {
                    errorElement.textContent = '';
                    errorElement.style.display = 'none';
                }
            }
        }
        updateSubmitButton(form);
    });

    form.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        if (target.id === 'personal-data-consent') {
            updateSubmitButton(form);
            target.style.accentColor = target.checked ? 'var(--g-color-base-brand)' : '';
        }
    });

    setTimeout(() => {
        document.addEventListener('click', (e) => {
            if (formEl && formEl.style.display === 'block' && !formEl.contains(e.target as Node)) {
                hideForm();
            }
        });
    }, 0);

    document.body.appendChild(form);
    return form;
}

function updateSubmitButton(form: HTMLDivElement): void {
    const commentEl = form.querySelector<HTMLTextAreaElement>('#selection-comment');
    const contactEl = form.querySelector<HTMLTextAreaElement>('#selection-contact');
    const consentEl = form.querySelector<HTMLInputElement>('#personal-data-consent');
    const submitBtn = form.querySelector<HTMLButtonElement>('#selection-submit');
    if (!submitBtn) return;

    const hasContact = (contactEl?.value ?? '').trim().length > 0;
    const hasConsent = consentEl?.checked ?? false;
    const exceedsLimit =
        (commentEl?.value.length ?? 0) > COMMENT_MAX_LENGTH ||
        (contactEl?.value.length ?? 0) > CONTACT_MAX_LENGTH;
    // Disable submit when contact is filled but consent is not given, or a field exceeds its length limit
    const disabled = (hasContact && !hasConsent) || exceedsLimit;

    submitBtn.disabled = disabled;
    submitBtn.style.opacity = disabled ? '0.5' : '';
    submitBtn.style.cursor = disabled ? 'not-allowed' : '';
    submitBtn.title = exceedsLimit
        ? 'Сократите текст до допустимой длины'
        : disabled
          ? 'Дайте согласие на обработку персональных данных'
          : '';
}

async function handleSubmit(): Promise<void> {
    const options = getFeedbackOptions();

    if (!options.customFormEndpoint) {
        showPopup('Функция обратной связи для выделенного текста не настроена', 'error');
        return;
    }

    if (!canSubmit()) {
        showPopup('Пожалуйста, подождите перед повторной отправкой', 'error');
        return;
    }

    const issue = formEl!.querySelector<HTMLInputElement>('input[name="issue"]:checked');
    const commentEl = formEl!.querySelector<HTMLTextAreaElement>('#selection-comment');
    const contactEl = formEl!.querySelector<HTMLTextAreaElement>('#selection-contact');
    const errorEl = formEl!.querySelector<HTMLDivElement>('#comment-error');

    if (!issue) {
        showPopup('Пожалуйста, выберите вариант ответа', 'error');
        return;
    }

    const comment = sanitizeInput(commentEl?.value ?? '');
    const contact = sanitizeInput(contactEl?.value ?? '');
    const issueValue = issue.value as CustomFormSuggestionEnum;

    const requiresExtraInfo = [
        CustomFormSuggestionEnum.ANOTHER,
        CustomFormSuggestionEnum.NON_RELEVANT,
        CustomFormSuggestionEnum.NO_EXAMPLE,
    ].includes(issueValue);

    if (requiresExtraInfo && !comment) {
        if (errorEl) {
            errorEl.textContent = 'Пожалуйста, заполните это поле! *';
            errorEl.style.display = 'block';
        }
        if (commentEl) {
            commentEl.style.borderColor = 'var(--g-color-base-brand)';
            commentEl.style.boxShadow = '0 0 0 1px var(--g-color-base-brand)';
            commentEl.focus();
        }
        return;
    }

    if (requiresExtraInfo && !contact) {
        const contactErrorEl = formEl!.querySelector<HTMLDivElement>('#contact-error');
        if (contactErrorEl) {
            contactErrorEl.textContent = 'Пожалуйста, заполните это поле! *';
            contactErrorEl.style.display = 'block';
        }
        if (contactEl) {
            contactEl.style.borderColor = 'var(--g-color-base-brand)';
            contactEl.style.boxShadow = '0 0 0 1px var(--g-color-base-brand)';
            contactEl.focus();
        }
        return;
    }

    if (comment && comment.length < 5) {
        if (errorEl) {
            errorEl.textContent = 'Комментарий должен содержать не менее 5 символов';
            errorEl.style.display = 'block';
        }
        if (commentEl) {
            commentEl.focus();
        }
        return;
    }

    if (comment.length > COMMENT_MAX_LENGTH) {
        if (errorEl) {
            errorEl.textContent = `Максимальное количество символов в комментарии - ${COMMENT_MAX_LENGTH}`;
            errorEl.style.display = 'block';
        }
        if (commentEl) {
            commentEl.focus();
        }
        return;
    }

    if (contact.length > CONTACT_MAX_LENGTH) {
        const contactErrorEl = formEl!.querySelector<HTMLDivElement>('#contact-error');
        if (contactErrorEl) {
            contactErrorEl.textContent = `Максимальное количество символов в контакте - ${CONTACT_MAX_LENGTH}`;
            contactErrorEl.style.display = 'block';
        }
        if (contactEl) {
            contactEl.focus();
        }
        return;
    }

    try {
        await sendData(options.customFormEndpoint, {
            url: location.href,
            title: document.title,
            suggestion: issueValue,
            selected_text: sanitizeInput(selectedText),
            comment,
            contact,
        });

        markSubmitted();
        hideForm();
        showPopup('Спасибо за отзыв!');
    } catch (error) {
        console.error('[TextFeedback] Failed to submit feedback:', error);
        showPopup('Не удалось отправить отзыв', 'error');
    }
}

function resetForm(): void {
    if (!formEl) return;

    const commentEl = formEl.querySelector<HTMLTextAreaElement>('#selection-comment');
    const contactEl = formEl.querySelector<HTMLTextAreaElement>('#selection-contact');
    const consentEl = formEl.querySelector<HTMLInputElement>('#personal-data-consent');
    const errorEl = formEl.querySelector<HTMLDivElement>('#comment-error');
    const contactErrorEl = formEl.querySelector<HTMLDivElement>('#contact-error');

    if (commentEl) {
        commentEl.value = '';
        commentEl.placeholder = 'Комментарий...';
        commentEl.style.borderColor = '#ddd';
        commentEl.style.boxShadow = 'none';
    }

    if (contactEl) {
        contactEl.value = '';
        contactEl.style.borderColor = '#ddd';
    }

    if (consentEl) {
        consentEl.checked = false;
        consentEl.style.accentColor = '';
    }

    if (errorEl) {
        errorEl.textContent = '';
        errorEl.style.display = 'none';
    }

    if (contactErrorEl) {
        contactErrorEl.textContent = '';
        contactErrorEl.style.display = 'none';
    }

    formEl.querySelectorAll<HTMLInputElement>('input[name="issue"]').forEach((r) => {
        r.checked = false;
    });

    updateSubmitButton(formEl);
}

function hideForm(): void {
    if (formEl) {
        formEl.style.display = 'none';
    }
    window.getSelection()?.removeAllRanges();
}

function positionForm(): void {
    if (!formEl) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
        Object.assign(formEl.style, {
            left: '50%',
            top: '40%',
            transform: 'translate(-50%, -50%)',
        });
        return;
    }

    const rect = selection.getRangeAt(0).getBoundingClientRect();
    const viewport = {width: window.innerWidth, height: window.innerHeight};

    // Use real rendered dimensions (form is visible:hidden at this point)
    const elementWidth = formEl.offsetWidth || 350;
    const elementHeight = formEl.offsetHeight || 350;

    let left = rect.left + 5;
    let top = rect.bottom + 5;

    if (left + elementWidth > viewport.width) {
        left = Math.max(5, rect.left - elementWidth - 5);
    }

    if (top + elementHeight > viewport.height) {
        top = Math.max(5, rect.top - elementHeight - 5);
    }

    if (window.innerWidth <= 768) {
        Object.assign(formEl.style, {
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            minWidth: '280px',
            maxWidth: '90vw',
        });
        return;
    }

    Object.assign(formEl.style, {
        left: Math.max(5, Math.min(left, viewport.width - elementWidth - 5)) + 'px',
        top: Math.max(5, Math.min(top, viewport.height - elementHeight - 5)) + 'px',
        transform: 'none',
    });
}
