// DONT PUT NODE CODE IN HERE FRONTEND ONLY
// Dark mode
function applyTheme(event) {
    if (event.matches) {
        document.body.classList.add("dark-theme");
    } else {
        document.body.classList.remove("dark-theme");
    }
}

window.addEventListener('load', () => {
    const prefersDarkMode = window.matchMedia("(prefers-color-scheme: dark)"); // get system preference

    applyTheme(prefersDarkMode);

    prefersDarkMode.addEventListener("change", applyTheme); // checks if browser preference changes
});

// Code from max's ATLS Project, modified from bookmark lists to note tags
let activeNoteId = null;

const tagsContainer = document.getElementById('tags-container');
const tagListDiv = document.getElementById('tag-list');
const addTagButton = document.getElementById('add-tag-button');
addTagButton.addEventListener('click', async () => {
    const newTagName = prompt("Enter new tag name:");
    const newTagColor = "#485696"; // Default color for new tags, in the future we want a hex code input, then a color picker wheel.
    if (newTagName && activeNoteId) {
        // Send to SQL 
        const response = await fetch(`/api/tags/${activeNoteId}/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tag_name: newTagName, tag_color: newTagColor })
        });

        if (response.ok) {
            // Close window and reset 
            tagsContainer.style.display = 'none';
            activeNoteId = null;
            // Re-fetch notes to show new badges on the main page
            window.location.reload();
        } else {
            alert("Error creating tag. It might already exist.");
        }
    }
});

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