import { getRequestHeaders } from '../../../../script.js';

const EXTENSION_NAME = 'MistraelSL Extension Manager';
const ROOT_SELECTOR = '.extensions_info';
const STORAGE_PREFIX = 'mistraelsl-extension-manager';
const SELF_FOLDER = decodeURIComponent(new URL('.', import.meta.url).pathname)
    .split('/')
    .filter(Boolean)
    .at(-1) || '';

const I18N = {
    en: {
        title: 'Extension Manager',
        subtitle: 'A calmer way to organize your SillyTavern extensions',
        installed: 'installed',
        active: 'active',
        updates: 'updates',
        search: 'Search extensions…',
        all: 'All',
        enabled: 'Enabled',
        disabled: 'Disabled',
        updateAvailable: 'Updates',
        builtIn: 'Built-in extensions',
        builtInHint: 'Included with SillyTavern and updated with the app',
        thirdParty: 'Installed extensions',
        thirdPartyHint: 'Extensions installed from external repositories',
        collapse: 'Collapse section',
        expand: 'Expand section',
        selected: '{count} selected',
        selectionSummary: 'Bulk selection · {count} selected',
        selectForBulk: 'Select for a bulk action',
        selectMode: 'Select',
        selectVisible: 'Select visible',
        cancelSelection: 'Cancel',
        enableSelected: 'Enable',
        disableSelected: 'Disable',
        deleteSelected: 'Delete',
        enabledStatus: 'Enabled',
        disabledStatus: 'Disabled',
        missingStatus: 'Unavailable',
        updateStatus: 'Update',
        selfProtected: 'The manager cannot delete itself while it is running',
        noResults: 'No extensions match these filters.',
        deleteTitle: 'Delete selected extensions?',
        deleteMessage: 'You are about to permanently delete {count} extensions:\n\n{names}\n\nThis cannot be undone. Extension-specific cleanup is not run during bulk deletion, so saved extension data may remain.',
        deleting: 'Deleting {current} of {total}…',
        deleteComplete: '{count} extensions deleted. SillyTavern will reload.',
        deletePartial: 'Deleted {success}; failed to delete {failed}. See the browser console for details.',
        deleteFailed: 'Could not delete the selected extensions.',
        modules: 'Extras API modules',
    },
    ru: {
        title: 'Менеджер расширений',
        subtitle: 'Спокойный и удобный порядок в расширениях SillyTavern',
        installed: 'установлено',
        active: 'включено',
        updates: 'обновлений',
        search: 'Найти расширение…',
        all: 'Все',
        enabled: 'Включённые',
        disabled: 'Выключенные',
        updateAvailable: 'Обновления',
        builtIn: 'Комплектные расширения',
        builtInHint: 'Входят в SillyTavern и обновляются вместе с ним',
        thirdParty: 'Установленные расширения',
        thirdPartyHint: 'Расширения, установленные из внешних репозиториев',
        collapse: 'Свернуть раздел',
        expand: 'Развернуть раздел',
        selected: 'Выбрано: {count}',
        selectionSummary: 'Массовый выбор · выбрано: {count}',
        selectForBulk: 'Выбрать для массового действия',
        selectMode: 'Выбрать',
        selectVisible: 'Выбрать видимые',
        cancelSelection: 'Отмена',
        enableSelected: 'Включить',
        disableSelected: 'Выключить',
        deleteSelected: 'Удалить',
        enabledStatus: 'Включено',
        disabledStatus: 'Выключено',
        missingStatus: 'Недоступно',
        updateStatus: 'Обновление',
        selfProtected: 'Менеджер не может удалить сам себя во время работы',
        noResults: 'По этим фильтрам расширений не найдено.',
        deleteTitle: 'Удалить выбранные расширения?',
        deleteMessage: 'Будут безвозвратно удалены расширения ({count}):\n\n{names}\n\nЭто действие нельзя отменить. При массовом удалении индивидуальная очистка данных расширений не запускается, поэтому сохранённые настройки могут остаться.',
        deleting: 'Удаление: {current} из {total}…',
        deleteComplete: 'Удалено расширений: {count}. SillyTavern будет перезагружен.',
        deletePartial: 'Удалено: {success}; не удалось удалить: {failed}. Подробности — в консоли браузера.',
        deleteFailed: 'Не удалось удалить выбранные расширения.',
        modules: 'Модули Extras API',
    },
};

function getLanguage() {
    const context = globalThis.SillyTavern?.getContext?.();
    const candidates = [
        document.documentElement.lang,
        context?.getCurrentLocale?.(),
        context?.locale,
        context?.language,
        navigator.language,
    ];

    return candidates.some(value => String(value || '').toLowerCase().startsWith('ru')) ? 'ru' : 'en';
}

function t(key, values = {}) {
    let text = I18N[getLanguage()]?.[key] ?? I18N.en[key] ?? key;
    for (const [name, value] of Object.entries(values)) {
        text = text.replaceAll(`{${name}}`, String(value));
    }
    return text;
}

function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
}

function createIconButton(icon, label, className = '') {
    const button = createElement('button', `sem-button ${className}`.trim());
    button.type = 'button';
    button.title = label;
    button.setAttribute('aria-label', label);
    const iconElement = createElement('i', `fa-solid ${icon}`);
    iconElement.setAttribute('aria-hidden', 'true');
    const labelElement = createElement('span', '', label);
    button.append(iconElement, labelElement);
    return button;
}

function normalizeExtensionName(name) {
    return String(name || '').replace(/^third-party\/?/i, '').replace(/^\/+/, '').replace(/\/+$/, '');
}

function getDisplayName(block) {
    return block.querySelector('.extension_name')?.textContent?.trim()
        || normalizeExtensionName(block.dataset.name)
        || 'Extension';
}

function getNativeToggle(block) {
    return block.querySelector('.extension_toggle input[type="checkbox"]');
}

function hasUpdate(block) {
    const button = block.querySelector('.btn_update');
    return Boolean(button && !button.classList.contains('displayNone') && !button.hidden);
}

function isEnabled(block) {
    const toggle = getNativeToggle(block);
    return Boolean(toggle?.checked);
}

function findDirectChild(root, descendant) {
    let current = descendant;
    while (current?.parentElement && current.parentElement !== root) {
        current = current.parentElement;
    }
    return current?.parentElement === root ? current : null;
}

function getStorageBoolean(key, fallback) {
    const value = localStorage.getItem(`${STORAGE_PREFIX}:${key}`);
    return value === null ? fallback : value === 'true';
}

function setStorageBoolean(key, value) {
    localStorage.setItem(`${STORAGE_PREFIX}:${key}`, String(Boolean(value)));
}

function decorateNativeToolbar(toolbar) {
    if (!toolbar) return;
    toolbar.classList.add('sem-native-toolbar');

    const controls = [...toolbar.children].filter(element => element.matches('button, .menu_button'));
    const icons = ['fa-arrows-rotate', 'fa-bolt', 'fa-arrow-down-wide-short'];
    controls.forEach((control, index) => {
        control.classList.add('sem-native-action');
        if (!control.querySelector('i')) {
            const icon = createElement('i', `fa-solid ${icons[index] || 'fa-sliders'}`);
            icon.setAttribute('aria-hidden', 'true');
            control.prepend(icon);
        }
    });
}

function decorateBlock(block, allowSelection) {
    block.classList.add('sem-card');
    const nativeToggle = getNativeToggle(block);
    const status = createElement('span', 'sem-status');

    if (nativeToggle?.disabled) {
        status.classList.add('is-missing');
        status.textContent = t('missingStatus');
    } else if (nativeToggle?.checked) {
        status.classList.add('is-enabled');
        status.textContent = t('enabledStatus');
    } else {
        status.classList.add('is-disabled');
        status.textContent = t('disabledStatus');
    }

    const textBlock = block.querySelector('.extension_text_block');
    if (textBlock && !textBlock.querySelector(':scope > .sem-status')) {
        textBlock.appendChild(status);
    }

    if (!allowSelection || block.querySelector(':scope > .sem-select-wrap')) return;

    const wrapper = createElement('label', 'sem-select-wrap');
    wrapper.title = t('selectForBulk');
    const checkbox = createElement('input', 'sem-select');
    checkbox.type = 'checkbox';
    checkbox.setAttribute('aria-label', `${t('selectForBulk')}: ${getDisplayName(block)}`);

    const folderName = normalizeExtensionName(block.dataset.name);
    if (folderName.localeCompare(SELF_FOLDER, undefined, { sensitivity: 'accent' }) === 0) {
        checkbox.disabled = true;
        wrapper.classList.add('is-protected');
        wrapper.title = t('selfProtected');
    }

    const visual = createElement('span', 'sem-select-visual');
    wrapper.append(checkbox, visual);
    block.prepend(wrapper);
}

function makeSection({ key, title, hint, container, count, defaultExpanded, headerActions }) {
    const section = createElement('section', `sem-section sem-section-${key}`);
    const header = createElement('div', 'sem-section-header');
    const toggle = createElement('button', 'sem-section-toggle');
    toggle.type = 'button';

    const icon = createElement('span', 'sem-section-icon');
    icon.innerHTML = key === 'builtin'
        ? '<i class="fa-solid fa-cubes-stacked" aria-hidden="true"></i>'
        : '<i class="fa-solid fa-puzzle-piece" aria-hidden="true"></i>';

    const copy = createElement('span', 'sem-section-copy');
    copy.append(
        createElement('strong', 'sem-section-title', title),
        createElement('small', 'sem-section-hint', hint),
    );
    const counter = createElement('span', 'sem-section-count', String(count));
    const chevron = createElement('i', 'fa-solid fa-chevron-down sem-section-chevron');
    chevron.setAttribute('aria-hidden', 'true');
    toggle.append(icon, copy, counter, chevron);

    const body = createElement('div', 'sem-section-body');
    container.classList.add('sem-section-native-container');
    body.appendChild(container);
    header.appendChild(toggle);
    if (headerActions) {
        headerActions.classList.add('sem-section-actions');
        header.appendChild(headerActions);
    }
    section.append(header, body);

    let expanded = getStorageBoolean(`section:${key}`, defaultExpanded);
    const renderExpanded = () => {
        section.classList.toggle('is-collapsed', !expanded);
        body.hidden = !expanded;
        toggle.setAttribute('aria-expanded', String(expanded));
        toggle.title = expanded ? t('collapse') : t('expand');
    };
    toggle.addEventListener('click', () => {
        expanded = !expanded;
        setStorageBoolean(`section:${key}`, expanded);
        renderExpanded();
    });
    renderExpanded();

    return { section, counter };
}

function makeFilterButton(key, icon, label, active = false) {
    const button = createElement('button', `sem-filter${active ? ' is-active' : ''}`);
    button.type = 'button';
    button.dataset.filter = key;
    button.setAttribute('aria-pressed', String(active));
    if (icon) {
        const iconElement = createElement('i', `fa-solid ${icon}`);
        iconElement.setAttribute('aria-hidden', 'true');
        button.appendChild(iconElement);
    }
    button.appendChild(createElement('span', '', label));
    return button;
}

async function confirmBulkDelete(blocks) {
    const names = blocks.map(getDisplayName);
    const visibleNames = names.slice(0, 8);
    const remainder = names.length - visibleNames.length;
    const namesText = `${visibleNames.map(name => `• ${name}`).join('\n')}${remainder > 0 ? `\n• … +${remainder}` : ''}`;
    const message = t('deleteMessage', { count: names.length, names: namesText });
    const popupApi = globalThis.SillyTavern?.getContext?.()?.Popup?.show;

    if (popupApi?.confirm) {
        return Boolean(await popupApi.confirm(t('deleteTitle'), message));
    }

    return globalThis.confirm(`${t('deleteTitle')}\n\n${message}`);
}

async function deleteExtensionBlock(block) {
    const extensionName = String(block.dataset.name || '');
    const global = Boolean(block.querySelector('.extension_icon .fa-server'));
    const response = await fetch('/api/extensions/delete', {
        method: 'POST',
        headers: getRequestHeaders(),
        body: JSON.stringify({ extensionName, global }),
    });

    if (!response.ok) {
        const details = await response.text();
        throw new Error(details || `${response.status} ${response.statusText}`);
    }
}

function enhanceManager(root) {
    if (!(root instanceof HTMLElement) || root.dataset.semEnhanced === 'true') return;
    root.dataset.semEnhanced = 'true';
    root.classList.add('sem-root');

    const dialog = root.closest('.popup');
    dialog?.classList.add('sem-dialog');

    const allBlocks = [...root.querySelectorAll('.extension_block')];
    const externalBlocks = allBlocks.filter(block => block.querySelector('.btn_delete'));
    const builtInBlocks = allBlocks.filter(block => !block.querySelector('.btn_delete'));
    const nativeToolbar = root.querySelector(':scope > .extensions_toolbar');
    const builtInContainer = builtInBlocks.length ? findDirectChild(root, builtInBlocks[0]) : null;
    const externalContainer = externalBlocks.length
        ? findDirectChild(root, externalBlocks[0])
        : [...root.children].find(child => child.querySelector?.('.third_party_toolbar'));

    if (!builtInContainer || !externalContainer) {
        console.warn(`[${EXTENSION_NAME}] Could not identify the native extension sections.`);
        return;
    }

    const externalHeader = externalContainer.querySelector(':scope > div:first-child');
    const externalActions = externalHeader?.querySelector('.third_party_toolbar') || null;
    externalActions?.classList.add('sem-native-bulk-hidden');
    if (externalActions) externalHeader?.classList.add('sem-native-bulk-header-hidden');
    const builtInHeading = builtInContainer.querySelector(':scope > h3');
    const externalHeading = externalHeader?.querySelector('h3');
    builtInHeading?.remove();
    externalHeading?.remove();
    if (externalHeader && !externalHeader.children.length) externalHeader.remove();

    allBlocks.forEach(block => decorateBlock(block, externalBlocks.includes(block)));
    decorateNativeToolbar(nativeToolbar);

    const hero = createElement('header', 'sem-hero');
    const brand = createElement('div', 'sem-brand');
    const brandIcon = createElement('div', 'sem-brand-icon');
    brandIcon.innerHTML = '<i class="fa-solid fa-layer-group" aria-hidden="true"></i>';
    const brandCopy = createElement('div', 'sem-brand-copy');
    brandCopy.append(
        createElement('h2', '', t('title')),
        createElement('p', '', t('subtitle')),
    );
    brand.append(brandIcon, brandCopy);

    const metrics = createElement('div', 'sem-metrics');
    const createMetric = (className, value, label) => {
        const metric = createElement('span', `sem-metric ${className}`);
        metric.append(createElement('strong', '', String(value)), createElement('small', '', label));
        return metric;
    };
    const installedMetric = createMetric('is-installed', allBlocks.length, t('installed'));
    const activeMetric = createMetric('is-active', allBlocks.filter(isEnabled).length, t('active'));
    const updatesMetric = createMetric('is-updates', allBlocks.filter(hasUpdate).length, t('updates'));
    metrics.append(installedMetric, activeMetric, updatesMetric);
    hero.append(brand, metrics);

    const commandBar = createElement('div', 'sem-command-bar');
    const searchWrap = createElement('label', 'sem-search');
    const searchIcon = createElement('i', 'fa-solid fa-magnifying-glass');
    searchIcon.setAttribute('aria-hidden', 'true');
    const search = createElement('input', 'text_pole sem-search-input');
    search.type = 'search';
    search.placeholder = t('search');
    search.setAttribute('aria-label', t('search'));
    searchWrap.append(searchIcon, search);
    commandBar.appendChild(searchWrap);
    if (nativeToolbar) commandBar.appendChild(nativeToolbar);

    const filterBar = createElement('div', 'sem-filter-bar');
    const filterOptions = createElement('div', 'sem-filter-options');
    const quickSelectButton = makeFilterButton('select-mode', 'fa-object-group', t('selectMode'));
    quickSelectButton.classList.add('sem-quick-select');
    filterOptions.append(
        makeFilterButton('all', '', t('all'), true),
        makeFilterButton('enabled', 'fa-circle-check', t('enabled')),
        makeFilterButton('disabled', 'fa-circle-pause', t('disabled')),
        makeFilterButton('updates', 'fa-cloud-arrow-down', t('updateAvailable')),
    );
    filterBar.append(filterOptions, quickSelectButton);

    const selectionBar = createElement('div', 'sem-selection-bar');
    selectionBar.hidden = true;
    const selectionCount = createElement('strong', 'sem-selection-count', t('selectionSummary', { count: 0 }));
    const selectVisibleButton = createIconButton('fa-check-double', t('selectVisible'));
    const cancelButton = createIconButton('fa-xmark', t('cancelSelection'));
    const enableButton = createIconButton('fa-power-off', t('enableSelected'), 'is-enable');
    const disableButton = createIconButton('fa-circle-pause', t('disableSelected'));
    const deleteButton = createIconButton('fa-trash-can', t('deleteSelected'), 'is-danger');
    const progress = createElement('span', 'sem-selection-progress');
    selectionBar.append(selectionCount, progress, selectVisibleButton, cancelButton, enableButton, disableButton, deleteButton);

    const builtInSection = makeSection({
        key: 'builtin',
        title: t('builtIn'),
        hint: t('builtInHint'),
        container: builtInContainer,
        count: builtInBlocks.length,
        defaultExpanded: false,
    });
    const externalSection = makeSection({
        key: 'external',
        title: t('thirdParty'),
        hint: t('thirdPartyHint'),
        container: externalContainer,
        count: externalBlocks.length,
        defaultExpanded: true,
    });

    const modulesElement = [...root.children].find(child => {
        if ([hero, commandBar, filterBar, selectionBar, builtInSection.section, externalSection.section].includes(child)) return false;
        return child.querySelector?.('h3') && !child.querySelector('.extension_block');
    });
    if (modulesElement) {
        modulesElement.classList.add('sem-modules');
        const heading = modulesElement.querySelector('h3');
        if (heading) heading.textContent = t('modules');
    }

    const errorBlocks = [...root.children].filter(child => child.classList.contains('info-block'));
    root.prepend(hero, commandBar, filterBar, selectionBar);
    root.append(...errorBlocks, builtInSection.section, externalSection.section);
    if (modulesElement) root.appendChild(modulesElement);

    let activeFilter = 'all';
    let selectionMode = false;
    const noResults = createElement('div', 'sem-empty', t('noResults'));
    noResults.hidden = true;
    root.insertBefore(noResults, modulesElement || null);

    const getSelectedBlocks = () => externalBlocks.filter(block => block.isConnected && block.querySelector('.sem-select')?.checked);

    const updateSelection = () => {
        const selected = getSelectedBlocks();
        selectionBar.hidden = !selectionMode;
        selectionCount.textContent = t('selectionSummary', { count: selected.length });
        root.classList.toggle('has-selection', selected.length > 0);
        if (!selectionBar.classList.contains('is-busy')) {
            enableButton.disabled = selected.length === 0;
            disableButton.disabled = selected.length === 0;
            deleteButton.disabled = selected.length === 0;
        }
    };

    const setSelectionMode = enabled => {
        selectionMode = Boolean(enabled);
        root.classList.toggle('is-selection-mode', selectionMode);
        quickSelectButton.classList.toggle('is-active', selectionMode);
        quickSelectButton.setAttribute('aria-pressed', String(selectionMode));

        if (!selectionMode) {
            externalBlocks.forEach(block => {
                const checkbox = block.querySelector('.sem-select');
                if (checkbox) checkbox.checked = false;
            });
        }

        updateSelection();
    };

    const updateMetrics = () => {
        installedMetric.querySelector('strong').textContent = String(allBlocks.filter(block => block.isConnected).length);
        activeMetric.querySelector('strong').textContent = String(allBlocks.filter(block => block.isConnected && isEnabled(block)).length);
        updatesMetric.querySelector('strong').textContent = String(allBlocks.filter(block => block.isConnected && hasUpdate(block)).length);
    };

    const applyFilters = () => {
        const query = search.value.trim().toLocaleLowerCase();
        let visibleCount = 0;

        for (const block of allBlocks) {
            if (!block.isConnected) continue;
            const matchesSearch = !query || `${getDisplayName(block)} ${block.dataset.name || ''}`.toLocaleLowerCase().includes(query);
            const matchesFilter = activeFilter === 'all'
                || (activeFilter === 'enabled' && isEnabled(block))
                || (activeFilter === 'disabled' && !isEnabled(block))
                || (activeFilter === 'updates' && hasUpdate(block));
            const visible = matchesSearch && matchesFilter;
            block.hidden = !visible;
            if (visible) visibleCount += 1;
        }

        builtInSection.counter.textContent = String(builtInBlocks.filter(block => block.isConnected && !block.hidden).length);
        externalSection.counter.textContent = String(externalBlocks.filter(block => block.isConnected && !block.hidden).length);
        noResults.hidden = visibleCount !== 0;
        updateMetrics();
    };

    filterBar.addEventListener('click', event => {
        const button = event.target.closest('.sem-filter');
        if (!button) return;
        if (button === quickSelectButton) {
            setSelectionMode(!selectionMode);
            return;
        }
        activeFilter = button.dataset.filter || 'all';
        filterOptions.querySelectorAll('.sem-filter').forEach(filter => {
            const active = filter === button;
            filter.classList.toggle('is-active', active);
            filter.setAttribute('aria-pressed', String(active));
        });
        applyFilters();
    });
    search.addEventListener('input', applyFilters);

    externalBlocks.forEach(block => {
        block.querySelector('.sem-select')?.addEventListener('change', updateSelection);
        getNativeToggle(block)?.addEventListener('change', () => {
            const oldStatus = block.querySelector('.sem-status');
            oldStatus?.remove();
            block.classList.remove('sem-card');
            decorateBlock(block, true);
            applyFilters();
        });
    });

    selectVisibleButton.addEventListener('click', () => {
        externalBlocks.forEach(block => {
            const checkbox = block.querySelector('.sem-select');
            if (!block.hidden && checkbox && !checkbox.disabled) checkbox.checked = true;
        });
        updateSelection();
    });
    cancelButton.addEventListener('click', () => setSelectionMode(false));

    const toggleSelected = enable => {
        getSelectedBlocks().forEach(block => {
            const toggle = getNativeToggle(block);
            if (toggle && !toggle.disabled && Boolean(toggle.checked) !== enable) toggle.click();
        });
        applyFilters();
    };
    enableButton.addEventListener('click', () => toggleSelected(true));
    disableButton.addEventListener('click', () => toggleSelected(false));

    deleteButton.addEventListener('click', async () => {
        const selected = getSelectedBlocks();
        if (!selected.length || !(await confirmBulkDelete(selected))) return;

        selectionBar.classList.add('is-busy');
        selectionBar.querySelectorAll('button').forEach(button => button.disabled = true);
        let success = 0;
        let failed = 0;

        for (let index = 0; index < selected.length; index += 1) {
            const block = selected[index];
            progress.textContent = t('deleting', { current: index + 1, total: selected.length });
            try {
                await deleteExtensionBlock(block);
                block.remove();
                success += 1;
            } catch (error) {
                failed += 1;
                console.error(`[${EXTENSION_NAME}] Failed to delete ${block.dataset.name}:`, error);
                block.classList.add('sem-delete-failed');
            }
        }

        progress.textContent = '';
        updateSelection();
        applyFilters();
        const toastr = globalThis.toastr;
        if (failed === 0) {
            toastr?.success?.(t('deleteComplete', { count: success }));
        } else if (success > 0) {
            toastr?.warning?.(t('deletePartial', { success, failed }));
        } else {
            toastr?.error?.(t('deleteFailed'));
        }

        if (success > 0) {
            window.setTimeout(() => location.reload(), 1400);
        } else {
            selectionBar.classList.remove('is-busy');
            selectionBar.querySelectorAll('button').forEach(button => button.disabled = false);
        }
    });

    let mutationQueued = false;
    const stateObserver = new MutationObserver(() => {
        if (mutationQueued) return;
        mutationQueued = true;
        requestAnimationFrame(() => {
            mutationQueued = false;
            applyFilters();
        });
    });
    externalBlocks.forEach(block => {
        const updateButton = block.querySelector('.btn_update');
        if (updateButton) stateObserver.observe(updateButton, { attributes: true, attributeFilter: ['class', 'hidden'] });
    });

    applyFilters();
    updateSelection();
}

function scanForManagers(node = document) {
    if (node instanceof Element && node.matches(ROOT_SELECTOR)) enhanceManager(node);
    node.querySelectorAll?.(ROOT_SELECTOR).forEach(enhanceManager);
}

function init() {
    scanForManagers();
    const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
            mutation.addedNodes.forEach(node => {
                if (node instanceof Element) scanForManagers(node);
            });
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const nativeButton = document.querySelector('#extensions_details');
    nativeButton?.classList.add('sem-manager-entry');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
    init();
}
