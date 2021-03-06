/**
 * main.js
 * http://www.codrops.com
 *
 * Licensed under the MIT license.
 * http://www.opensource.org/licenses/mit-license.php
 *
 * Copyright 2016, Codrops
 * http://www.codrops.com
 */
;(function (window) {

    'use strict';

    // helper functions
    // from https://davidwalsh.name/vendor-prefix
    var prefix = (function () {
        var styles = window.getComputedStyle(document.documentElement, ''),
            pre = (Array.prototype.slice.call(styles).join('').match(/-(moz|webkit|ms)-/) || (styles.OLink === '' && ['', 'o']))[1],
            dom = ('WebKit|Moz|MS|O').match(new RegExp('(' + pre + ')', 'i'))[1];

        return {
            dom: dom,
            lowercase: pre,
            css: '-' + pre + '-',
            js: pre[0].toUpperCase() + pre.substr(1)
        };
    })();

    // vars & stuff
    var support = {transitions: Modernizr.csstransitions},
        transEndEventNames = {
            'WebkitTransition': 'webkitTransitionEnd',
            'MozTransition': 'transitionend',
            'OTransition': 'oTransitionEnd',
            'msTransition': 'MSTransitionEnd',
            'transition': 'transitionend'
        },
        transEndEventName = transEndEventNames[Modernizr.prefixed('transition')],
        onEndTransition = function (el, callback, propTest) {
            var onEndCallbackFn = function (ev) {
                if (support.transitions) {
                    if (ev.target != this || propTest && ev.propertyName !== propTest && ev.propertyName !== prefix.css + propTest) return;
                    this.removeEventListener(transEndEventName, onEndCallbackFn);
                }
                if (callback && typeof callback === 'function') {
                    callback.call(this);
                }
            };
            if (support.transitions) {
                el.addEventListener(transEndEventName, onEndCallbackFn);
            }
            else {
                onEndCallbackFn();
            }
        },
        // the hospital element
        hospital = document.querySelector('.hospital'),
        // hospital´s levels wrapper
        hospitalLevelsEl = hospital.querySelector('.levels'),
        // hospital´s levels
        hospitalLevels = [].slice.call(hospitalLevelsEl.querySelectorAll('.level')),
        // total levels
        hospitalLevelsTotal = hospitalLevels.length,
        // surroundings elems
        hospitalSurroundings = [].slice.call(hospital.querySelectorAll('.surroundings')),
        // selected level position
        selectedLevel,
        // navigation element wrapper
        hospitalNav = document.querySelector('.hospitalnav'),
        // show all hospital´s levels ctrl
        allLevelsCtrl = hospitalNav.querySelector('.hospitalnav__button--all-levels'),
        // levels navigation up/down ctrls
        levelUpCtrl = hospitalNav.querySelector('.hospitalnav__button--up'),
        levelDownCtrl = hospitalNav.querySelector('.hospitalnav__button--down'),
        // pins
        pins = [].slice.call(hospitalLevelsEl.querySelectorAll('.pin')),
        // content element
        contentEl = document.querySelector('.content'),
        // content close ctrl
        contentCloseCtrl = contentEl.querySelector('button.content__button'),
        // check if a content item is opened
        isOpenContentArea,
        // check if currently animating/navigating
        isNavigating,
        // check if all levels are shown or if one level is shown (expanded)
        isExpanded,
        // spaces list element
        spacesListEl = document.getElementById('spaces-list'),
        // spaces list ul
        spacesEl = spacesListEl.querySelector('ul.list'),
        // all the spaces listed
        spaces = [].slice.call(spacesEl.querySelectorAll('.list__item > a.list__link')),
        // reference to the current shows space (name set in the data-name attr of both the listed spaces and the pins on the map)
        spaceref,
        // sort by ctrls
        sortByNameCtrl = document.querySelector('#sort-by-name'),
        // listjs initiliazation (all hospital´s spaces)
        spacesList = new List('spaces-list', {valueNames: ['list__link', {data: ['level']}, {data: ['category']}]}),

        // shospitaler screens:
        // open search ctrl
        openSearchCtrl = document.querySelector('button.open-search'),
        // main container
        containerEl = document.querySelector('.container'),
        // close search ctrl
        closeSearchCtrl = spacesListEl.querySelector('button.close-search');

    function init() {
        // init/bind events
        initEvents();
    }

    /**
     * Initialize/Bind events fn.
     */
    function initEvents() {
        // click on a hospital´s level
        hospitalLevels.forEach(function (level, pos) {
            level.addEventListener('click', function () {
                // shows this level
                showLevel(pos + 1);
            });
        });

        // click on the show hospital´s levels ctrl
        allLevelsCtrl.addEventListener('click', function () {
            // shows all levels
            showAllLevels();
        });

        // navigating through the levels
        levelUpCtrl.addEventListener('click', function () {
            navigate('Down');
        });
        levelDownCtrl.addEventListener('click', function () {
            navigate('Up');
        });

        // sort by name ctrl - add/remove category name (css pseudo element) from list and sorts the spaces by name 
        sortByNameCtrl.addEventListener('click', function () {
            if (this.checked) {
                classie.remove(spacesEl, 'grouped-by-category');
                spacesList.sort('list__link');
            }
            else {
                classie.add(spacesEl, 'grouped-by-category');
                spacesList.sort('category');
            }
        });

        // hovering a pin / clicking a pin
        pins.forEach(function (pin) {
            var contentItem = contentEl.querySelector('.content__item[data-space="' + pin.getAttribute('data-space') + '"]');

            pin.addEventListener('mouseenter', function () {
                if (!isOpenContentArea) {
                    classie.add(contentItem, 'content__item--hover');
                }
            });
            pin.addEventListener('mouseleave', function () {
                if (!isOpenContentArea) {
                    classie.remove(contentItem, 'content__item--hover');
                }
            });
            pin.addEventListener('click', function (ev) {
                ev.preventDefault();
                // open content for this pin
                openContent(pin.getAttribute('data-space'));
                // remove hover class (showing the title)
                classie.remove(contentItem, 'content__item--hover');
            });
        });

        // closing the content area
        contentCloseCtrl.addEventListener('click', function () {
            closeContentArea();
        });

        // clicking on a listed space: open level - shows space
        spaces.forEach(function (space) {
            var spaceItem = space.parentNode,
                level = spaceItem.getAttribute('data-level'),
                spacerefval = spaceItem.getAttribute('data-space');

            space.addEventListener('click', function (ev) {
                ev.preventDefault();
                // for shospitaler screens: close search bar
                closeSearch();
                // open level
                showLevel(level);
                // open content for this space
                openContent(spacerefval);
            });
        });

        // shospitaler screens: open the search bar
        openSearchCtrl.addEventListener('click', function () {
            openSearch();
        });

        // shospitaler screens: close the search bar
        closeSearchCtrl.addEventListener('click', function () {
            closeSearch();
        });
    }

    /**
     * Opens a level. The current level moves to the center while the other ones move away.
     */
    function showLevel(level) {
        if (isExpanded) {
            return false;
        }

        // update selected level val
        selectedLevel = level;

        // control navigation controls state
        setNavigationState();

        classie.add(hospitalLevelsEl, 'levels--selected-' + selectedLevel);

        // the level element
        var levelEl = hospitalLevels[selectedLevel - 1];
        classie.add(levelEl, 'level--current');

        onEndTransition(levelEl, function () {
            classie.add(hospitalLevelsEl, 'levels--open');

            // show level pins
            showPins();

            isExpanded = true;
        }, 'transform');

        // hide surroundings element
        hideSurroundings();

        // show hospital nav ctrls
        showhospitalNav();

        // filter the spaces for this level
        showLevelSpaces();
    }

    /**
     * Shows all hospital´s levels
     */
    function showAllLevels() {
        if (isNavigating || !isExpanded) {
            return false;
        }
        isExpanded = false;

        classie.remove(hospitalLevels[selectedLevel - 1], 'level--current');
        classie.remove(hospitalLevelsEl, 'levels--selected-' + selectedLevel);
        classie.remove(hospitalLevelsEl, 'levels--open');

        // hide level pins
        removePins();

        // shows surrounding element
        showSurroundings();

        // hide hospital nav ctrls
        hidehospitalNav();

        // show back the complete list of spaces
        spacesList.filter();

        // close content area if it is open
        if (isOpenContentArea) {
            closeContentArea();
        }
    }

    /**
     * Shows all spaces for current level
     */
    function showLevelSpaces() {
        spacesList.filter(function (item) {
            return item.values().level === selectedLevel.toString();
        });
    }

    /**
     * Shows the level´s pins
     */
    function showPins(levelEl) {
        var levelEl = levelEl || hospitalLevels[selectedLevel - 1];
        classie.add(levelEl.querySelector('.level__pins'), 'level__pins--active');
    }

    /**
     * Removes the level´s pins
     */
    function removePins(levelEl) {
        var levelEl = levelEl || hospitalLevels[selectedLevel - 1];
        classie.remove(levelEl.querySelector('.level__pins'), 'level__pins--active');
    }

    /**
     * Show the navigation ctrls
     */
    function showhospitalNav() {
        classie.remove(hospitalNav, 'hospitalnav--hidden');
    }

    /**
     * Hide the navigation ctrls
     */
    function hidehospitalNav() {
        classie.add(hospitalNav, 'hospitalnav--hidden');
    }

    /**
     * Show the surroundings level
     */
    function showSurroundings() {
        hospitalSurroundings.forEach(function (el) {
            classie.remove(el, 'surroundings--hidden');
        });
    }

    /**
     * Hide the surroundings level
     */
    function hideSurroundings() {
        hospitalSurroundings.forEach(function (el) {
            classie.add(el, 'surroundings--hidden');
        });
    }

    /**
     * Navigate through the hospital´s levels
     */
    function navigate(direction) {
        if (isNavigating || !isExpanded || isOpenContentArea) {
            return false;
        }
        isNavigating = true;

        var prevSelectedLevel = selectedLevel;

        // current level
        var currentLevel = hospitalLevels[prevSelectedLevel - 1];

        if (direction === 'Up' && prevSelectedLevel > 1) {
            --selectedLevel;
        }
        else if (direction === 'Down' && prevSelectedLevel < hospitalLevelsTotal) {
            ++selectedLevel;
        }
        else {
            isNavigating = false;
            return false;
        }

        // control navigation controls state (enabled/disabled)
        setNavigationState();
        // transition direction class
        classie.add(currentLevel, 'level--moveOut' + direction);
        // next level element
        var nextLevel = hospitalLevels[selectedLevel - 1]
        // ..becomes the current one
        classie.add(nextLevel, 'level--current');

        // when the transition ends..
        onEndTransition(currentLevel, function () {
            classie.remove(currentLevel, 'level--moveOut' + direction);
            // solves rendering bug for the SVG opacity-fill property
            setTimeout(function () {
                classie.remove(currentLevel, 'level--current');
            }, 60);

            classie.remove(hospitalLevelsEl, 'levels--selected-' + prevSelectedLevel);
            classie.add(hospitalLevelsEl, 'levels--selected-' + selectedLevel);

            // show the current level´s pins
            showPins();

            isNavigating = false;
        });

        // filter the spaces for this level
        showLevelSpaces();

        // hide the previous level´s pins
        removePins(currentLevel);
    }

    /**
     * Control navigation ctrls state. Add disable class to the respective ctrl when the current level is either the first or the last.
     */
    function setNavigationState() {
        if (selectedLevel == 1) {
            classie.add(levelDownCtrl, 'boxbutton--disabled');
        }
        else {
            classie.remove(levelDownCtrl, 'boxbutton--disabled');
        }

        if (selectedLevel == hospitalLevelsTotal) {
            classie.add(levelUpCtrl, 'boxbutton--disabled');
        }
        else {
            classie.remove(levelUpCtrl, 'boxbutton--disabled');
        }
    }

    /**
     * Opens/Reveals a content item.
     */
    function openContent(spacerefval) {
        // if one already shown:
        if (isOpenContentArea) {
            hideSpace();
            spaceref = spacerefval;
            showSpace();
        }
        else {
            spaceref = spacerefval;
            openContentArea();
        }

        // remove class active (if any) from current list item
        var activeItem = spacesEl.querySelector('li.list__item--active');
        if (activeItem) {
            classie.remove(activeItem, 'list__item--active');
        }
        // list item gets class active
        classie.add(spacesEl.querySelector('li[data-space="' + spacerefval + '"]'), 'list__item--active');

        // remove class selected (if any) from current space
        var activeSpaceArea = hospitalLevels[selectedLevel - 1].querySelector('svg > .map__space--selected');
        if (activeSpaceArea) {
            classie.remove(activeSpaceArea, 'map__space--selected');
        }
        // svg area gets selected
        classie.add(hospitalLevels[selectedLevel - 1].querySelector('svg > .map__space[data-space="' + spaceref + '"]'), 'map__space--selected');
    }

    /**
     * Opens the content area.
     */
    function openContentArea() {
        isOpenContentArea = true;
        // shows space
        showSpace(true);
        // show close ctrl
        classie.remove(contentCloseCtrl, 'content__button--hidden');
        // resize hospital area
        classie.add(hospital, 'hospital--content-open');
        // disable hospital nav ctrls
        classie.add(levelDownCtrl, 'boxbutton--disabled');
        classie.add(levelUpCtrl, 'boxbutton--disabled');
    }

    /**
     * Shows a space.
     */
    function showSpace(sliding) {
        // the content item
        var contentItem = contentEl.querySelector('.content__item[data-space="' + spaceref + '"]');
        // show content
        classie.add(contentItem, 'content__item--current');
        if (sliding) {
            onEndTransition(contentItem, function () {
                classie.add(contentEl, 'content--open');
            });
        }
        // map pin gets selected
        classie.add(hospitalLevelsEl.querySelector('.pin[data-space="' + spaceref + '"]'), 'pin--active');
    }

    /**
     * Closes the content area.
     */
    function closeContentArea() {
        classie.remove(contentEl, 'content--open');
        // close current space
        hideSpace();
        // hide close ctrl
        classie.add(contentCloseCtrl, 'content__button--hidden');
        // resize hospital area
        classie.remove(hospital, 'hospital--content-open');
        // enable hospital nav ctrls
        if (isExpanded) {
            setNavigationState();
        }
        isOpenContentArea = false;
    }

    /**
     * Hides a space.
     */
    function hideSpace() {
        // the content item
        var contentItem = contentEl.querySelector('.content__item[data-space="' + spaceref + '"]');
        // hide content
        classie.remove(contentItem, 'content__item--current');
        // map pin gets unselected
        classie.remove(hospitalLevelsEl.querySelector('.pin[data-space="' + spaceref + '"]'), 'pin--active');
        // remove class active (if any) from current list item
        var activeItem = spacesEl.querySelector('li.list__item--active');
        if (activeItem) {
            classie.remove(activeItem, 'list__item--active');
        }
        // remove class selected (if any) from current space
        var activeSpaceArea = hospitalLevels[selectedLevel - 1].querySelector('svg > .map__space--selected');
        if (activeSpaceArea) {
            classie.remove(activeSpaceArea, 'map__space--selected');
        }
    }

    /**
     * for shospitaler screens: open search bar
     */
    function openSearch() {
        // shows all levels - we want to show all the spaces for shospitaler screens
        showAllLevels();

        classie.add(spacesListEl, 'spaces-list--open');
        classie.add(containerEl, 'container--overflow');
    }

    /**
     * for shospitaler screens: close search bar
     */
    function closeSearch() {
        classie.remove(spacesListEl, 'spaces-list--open');
        classie.remove(containerEl, 'container--overflow');
    }

    init();

})(window);