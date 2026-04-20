// DONT PUT NODE CODE IN HERE FRONTEND ONLY
// Dark mode
function applyTheme(event) {
    if (event.matches) {
        document.body.classList.add("dark-theme");
        // make sure toggle is set to dark mode
    } else {
        document.body.classList.remove("dark-theme");
        // make sure toggle is set to light mode
    }
}


window.addEventListener('load', () => {
    const prefersDarkMode = window.matchMedia("(prefers-color-scheme: dark)"); // get system preference

    applyTheme(prefersDarkMode);
    getWeather(); // update widget
    loadTagBadges(); // load tags for each note
    checkTaskNotifications();

    prefersDarkMode.addEventListener("change", applyTheme); // checks if browser preference changes
});

// Code from max's ATLS Project, modified from bookmark lists to note tags
let activeNoteId = null;

const tagsContainer = document.getElementById('tags-container');
const tagListDiv = document.getElementById('tag-list');
const addTagButton = document.getElementById('add-tag-button');

// only run tag UI code if these elements exist on the page
if (tagsContainer && tagListDiv && addTagButton) {
    addTagButton.addEventListener('click', async () => {
        const newTagName = document.getElementById('tag-name-input').value.trim();
        const newTagColor = document.getElementById('tag-color-picker').value;

        if (!newTagName || !activeNoteId) return;

        const response = await fetch(`/api/tags/${activeNoteId}/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tag_name: newTagName, tag_color: newTagColor })
        });

        if (response.ok) {
            document.getElementById('tag-name-input').value = ''; // clear input
            tagsContainer.style.display = 'none';
            activeNoteId = null;
            loadTagBadges();
        } else {
            alert("Error creating tag. It might already exist.");
        }
    });
}

async function displayTags(button, noteId) { // function to display the container of users tags with active tags for the cur note at the top
    // check if this note is already active, if so close the menu and reset activeNoteId
    if (activeNoteId === noteId && tagsContainer.style.display === 'flex') {
        tagsContainer.style.display = 'none';
        activeNoteId = null;
        return;
    }

    activeNoteId = noteId;

    if (!activeNoteId) {
        console.error("Error: No note selected.");
        return;
    }
    // get button position and move container
    const parentContainer = button.parentElement; // get position of button
    parentContainer.appendChild(tagsContainer);

    // draw menu
    tagListDiv.innerHTML = "Loading...";
    tagsContainer.style.display = 'flex';

    try {
        // SQL Fetch
        const res = await fetch(`/api/tags/${activeNoteId}`);
        const { allTags, currentTagIds } = await res.json();

        tagListDiv.innerHTML = ""; // clear previous render

        allTags.forEach(tag => {
            const itemLabel = document.createElement('label');
            itemLabel.className = 'note-tag-item';

            const noteInTag = document.createElement('input');
            noteInTag.type = 'checkbox';
            noteInTag.value = tag.tag_id;

            // Database check
            if (currentTagIds.includes(tag.tag_id)) {
                noteInTag.checked = true;
            }

            // Sync with SQL
            noteInTag.addEventListener('change', async () => {
                const action = noteInTag.checked ? 'link' : 'unlink';

                await fetch(`/api/tags/${activeNoteId}/toggle`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tag_id: tag.tag_id, action: action })
                });

                // Update UI feedback on the original button
                button.classList.toggle('tagged', noteInTag.checked);
            });

            itemLabel.appendChild(noteInTag);
            itemLabel.appendChild(document.createTextNode(" " + tag.name));
            tagListDiv.appendChild(itemLabel);
        });
    } catch (err) {
        tagListDiv.innerHTML = "Error loading tags.";
        console.error(err);
    }
}

// Function uses the browsers built in navigator library to get the users geolocation (if permitted). It then makes a call to a free weater API call which will then update the weather widget accordingly.
async function getWeather() {
    const weatherWidget = document.getElementById('weather-widget');
    if (!weatherWidget) return; // error check, does it exist

    if (!navigator.geolocation) { // error check, does browser support geolocation
        weatherWidget.textContent = 'Geolocation not supported.';
        return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;

        try {
            const response = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weathercode,windspeed_10m&temperature_unit=fahrenheit`
            );
            const data = await response.json();
            const { temperature_2m, windspeed_10m, weathercode } = data.current;

            weatherWidget.innerHTML = `
                <span>${getWeatherEmoji(weathercode)}</span>
                <span>${temperature_2m}°F</span>
                <span>Wind: ${windspeed_10m} mph</span>
            `;
        } catch (err) {
            weatherWidget.textContent = 'Could not load weather.';
            console.error(err);
        }
    }, () => {
        weatherWidget.textContent = 'Location access denied.';
    });
}


function getWeatherEmoji(code) {
    if (code === 0) return '☀️';
    else if (code <= 3) return '⛅';
    else if (code <= 48) return '🌫️';
    else if (code <= 67) return '🌧️';
    else if (code <= 77) return '❄️';
    else if (code <= 82) return '🌦️';
    else if (code <= 99) return '⛈️';
    return '🌡️';
}

// Tag Visualization
async function loadTagBadges() {
    const badgeContainers = document.querySelectorAll('.tag-badges');
    if (!badgeContainers.length) return;  // dont render if no badges

    for (const container of badgeContainers) {
        const noteId = container.dataset.noteId;

        try {
            const res = await fetch(`/api/tags/note/${noteId}`);
            const { tags } = await res.json();

            container.innerHTML = ''; // clear loading state

            tags.forEach(tag => {
                const badge = document.createElement('span');
                badge.textContent = tag.name;
                badge.style.backgroundColor = tag.color;
                badge.style.color = '#fff';
                badge.style.fontSize = '0.75rem';
                badge.style.padding = '2px 8px';
                badge.style.borderRadius = '999px';
                container.appendChild(badge);
            });
        } catch (err) {
            console.error(`Failed to load tags for note ${noteId}:`, err);
        }
    }
}

// notification system
function showBanner(message, isError) {

    const banner = document.createElement('div');
    banner.className = `alert alert-${isError ? 'danger' : 'success'}`;
    banner.setAttribute('role', 'alert');
    banner.textContent = message;
    document.body.prepend(banner);
    setTimeout(() => banner.remove(), 5000);

    if ('Notification' in window) { // if notifcation api exisits in browser
        Notification.requestPermission().then(permission => { // try to get user permission
            if (permission === 'granted') { // if user gave permission
                new Notification(message); // pass banner to notification (typically a task)
            }
        });
    }
}


function checkTaskNotifications() { // atm, it only works when page is open
    const overdueTask = document.querySelector('[data-overdue]');
    if (!overdueTask) return; // not on the tasks page, bail out

    const overdueCount = parseInt(overdueTask.dataset.overdue) || 0;
    const weekCount = parseInt(overdueTask.dataset.week) || 0;

    if (overdueCount > 0) {
        showBanner(`You have ${overdueCount} overdue task(s)!`, true);
    } else if (weekCount > 0) {
        showBanner(`${weekCount} task(s) due this week`, false);
    }
}