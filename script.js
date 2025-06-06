// script.js

// --- DOM elements ---
// Elements that appear only on index.html or are primary to index.html functionality
const toggleFormButton = document.getElementById('toggleFormButton');
const talentFormSection = document.getElementById('talentFormSection');
const talentTableBody = document.querySelector('#talentTable tbody');
const talentForm = document.getElementById('talentForm');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const primarySkillInput = document.getElementById('primarySkill');
const specificSkillsInput = document.getElementById('specificSkills');
const yearsExperienceInput = document.getElementById('yearsExperience');
const submitButton = talentForm ? talentForm.querySelector('button[type="submit"]') : null; // Check if talentForm exists
const formFeedback = document.getElementById('formFeedback');
const primarySkillFilter = document.getElementById('primarySkillFilter');
const minExperienceFilter = document.getElementById('minExperienceFilter');
const maxExperienceFilter = document.getElementById('maxExperienceFilter');
const searchInput = document.getElementById('searchInput');

// Pagination & Sorting DOM elements (primarily on index.html)
const prevPageBtn = document.getElementById('prevPageBtn');
const nextPageBtn = document.getElementById('nextPageBtn');
const pageInfoSpan = document.getElementById('pageInfo');
const tableHeaders = document.querySelectorAll('#talentTable th[data-sort]');

// Export button DOM element (primarily on index.html)
const exportCsvBtn = document.getElementById('exportCsvBtn');

// Talent Details Modal DOM elements (primarily on index.html)
const talentDetailsModal = document.getElementById('talentDetailsModal');
const closeButton = talentDetailsModal ? talentDetailsModal.querySelector('.close-button') : null; // Check if modal exists
const detailId = document.getElementById('detailId');
const detailName = document.getElementById('detailName');
const detailEmail = document.getElementById('detailEmail');
const detailPrimarySkill = document.getElementById('detailPrimarySkill');
const detailSpecificSkills = document.getElementById('detailSpecificSkills');
const detailYearsExperience = document.getElementById('detailYearsExperience'); // Corrected from yearsExperience

// Elements that appear only on login.html or are primary to login.html functionality
const loginFormArea = document.getElementById('loginFormArea');
const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('username'); // These will be null on index.html
const passwordInput = document.getElementById('password'); // These will be null on index.html
const authFeedback = document.getElementById('authFeedback'); // This will be null on index.html

// Elements that appear on index.html for auth status
const loggedInStatus = document.getElementById('loggedInStatus');
const currentUserSpan = document.getElementById('currentUser');
const currentUserRoleSpan = document.getElementById('currentUserRole');
const logoutButton = document.getElementById('logoutButton');


// Frontend state variables
let editingTalentId = null;

// Pagination & Sorting state variables
let currentPage = 1;
const itemsPerPage = 5;
let currentSortColumn = 'id';
let sortDirection = 'asc';

// User authentication state
let isAuthenticated = false;
let currentUserRole = 'guest'; // 'guest', 'user', 'admin'


// Base URL for your Flask API
// **MAKE SURE THESE ARE YOUR ACTUAL RENDER BACKEND URLS**
const API_BASE_URL = 'https://talent-management-app-9e8m.onrender.com/api/talents';
const AUTH_API_BASE_URL = 'https://talent-management-app-9e8m.onrender.com/api';


// --- Helper Functions ---

// Function to display general feedback messages to the user (can be for form or auth)
function showFeedback(message, type = 'success', targetElement) {
    // Determine target element based on current page
    let actualTarget = formFeedback; // Default for talent form page
    if (window.location.pathname.includes('login.html') && authFeedback) {
        actualTarget = authFeedback; // For login page
    } else if (targetElement) { // If a specific target was passed
        actualTarget = targetElement;
    }

    if (!actualTarget) return; // Exit if no valid target element is found

    actualTarget.innerHTML = message;
    actualTarget.className = `feedback-message ${type} show`;
    actualTarget.style.opacity = 1; // Ensure it's visible initially

    setTimeout(() => {
        actualTarget.style.opacity = 0;
        const handler = () => {
            if (actualTarget.style.opacity == 0) {
                actualTarget.textContent = '';
                actualTarget.className = 'feedback-message';
                actualTarget.removeEventListener('transitionend', handler);
            }
        };
        actualTarget.addEventListener('transitionend', handler);
    }, 3000);
}

// Helper function to clear all specific input error messages
function clearInputErrors() {
    document.querySelectorAll('.input-error').forEach(span => {
        span.textContent = '';
    });
}

// Helper function to display specific input error
function showInputError(elementId, message) {
    const errorSpan = document.getElementById(elementId + 'Error');
    if (errorSpan) {
        errorSpan.innerHTML = message;
    }
}

// Function to clear the form and reset editing state/feedback (only applies to talentForm)
function clearFormAndErrors() {
    editingTalentId = null;
    if (talentForm) { // Only attempt to clear if talentForm exists (on index.html)
        talentForm.reset();
        if (submitButton) {
            submitButton.textContent = 'Add Talent';
        }
    }
    clearInputErrors();
    // Only clear form feedback if it exists
    if (formFeedback) {
        formFeedback.textContent = '';
        formFeedback.className = 'feedback-message';
        formFeedback.style.opacity = 0;
    }
}

// Function to update UI based on authentication status and role
function updateUIForAuth(authenticated, role = 'guest', username = 'Guest') {
    isAuthenticated = authenticated;
    currentUserRole = role;

    const currentPath = window.location.pathname; // Get the current page URL

    // --- Logic for when the user IS authenticated ---
    if (isAuthenticated) {
        if (currentPath.includes('login.html')) {
            // If logged in and on the login page, redirect to the main page
            window.location.href = 'index.html';
            return; // Exit function as we are redirecting
        } else {
            // If logged in and on the main (index.html) page
            if (loggedInStatus) loggedInStatus.style.display = 'block';
            if (currentUserSpan) currentUserSpan.textContent = username;
            if (currentUserRoleSpan) currentUserRoleSpan.textContent = role;
            if (logoutButton) logoutButton.style.display = 'inline-block';

            // Show/hide elements based on role (only for index.html elements)
            if (currentUserRole === 'admin') {
                if (toggleFormButton) toggleFormButton.style.display = 'block';
                if (exportCsvBtn) exportCsvBtn.style.display = 'block';
            } else {
                if (toggleFormButton) toggleFormButton.style.display = 'none';
                if (talentFormSection) talentFormSection.style.display = 'none'; // Ensure add form is hidden for non-admins
                if (exportCsvBtn) exportCsvBtn.style.display = 'none';
            }
        }
    }
    // --- Logic for when the user is NOT authenticated ---
    else {
        if (!currentPath.includes('login.html')) {
            // If not logged in and on the main page, redirect to login page
            window.location.href = 'login.html';
            return; // Exit function as we are redirecting
        } else {
            // If not logged in and on the login page, ensure login form is visible
            if (loginFormArea) loginFormArea.style.display = 'block';
            // Ensure main page elements are hidden, just in case (e.g., if login.html included script.js from index.html)
            if (loggedInStatus) loggedInStatus.style.display = 'none';
            if (logoutButton) logoutButton.style.display = 'none';
            if (toggleFormButton) toggleFormButton.style.display = 'none';
            if (talentFormSection) talentFormSection.style.display = 'none';
            if (exportCsvBtn) exportCsvBtn.style.display = 'none';
        }
    }

    // Re-render the table to show/hide action buttons based on role (only on index.html)
    // This needs to happen AFTER redirects are handled.
    if (!currentPath.includes('login.html')) {
        fetchTalents();
    }
}


// Function to render the talents into the HTML table (UPDATED for View Details button and conditional action buttons)
function renderTalentsTable(talentsToRender) {
    if (!talentTableBody) return; // Only render if on the page with the table

    talentTableBody.innerHTML = '';

    if (talentsToRender.length === 0) {
        const row = talentTableBody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 6;
        cell.textContent = 'No talents found matching your criteria.';
        cell.style.textAlign = 'center';
        return;
    }

    talentsToRender.forEach(talent => {
        const row = talentTableBody.insertRow();
        row.insertCell().textContent = talent.name;
        row.insertCell().textContent = talent.email;
        row.insertCell().textContent = talent.primarySkill;
        row.insertCell().textContent = talent.specificSkills;
        row.insertCell().textContent = talent.yearsExperience;

        const actionsCell = row.insertCell();
        actionsCell.classList.add('actions');

        // View Details Button (always visible on index.html)
        const viewButton = document.createElement('button');
        viewButton.textContent = 'View';
        viewButton.classList.add('view-btn');
        viewButton.dataset.id = talent.id;
        viewButton.addEventListener('click', () => showTalentDetails(talent.id));
        actionsCell.appendChild(viewButton);

        // Edit and Delete buttons (only visible for admins)
        if (isAuthenticated && currentUserRole === 'admin') {
            const editButton = document.createElement('button');
            editButton.textContent = 'Edit';
            editButton.classList.add('edit-btn');
            editButton.dataset.id = talent.id;
            editButton.addEventListener('click', () => editTalent(talent.id));
            actionsCell.appendChild(editButton);

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.classList.add('delete-btn');
            deleteButton.dataset.id = talent.id;
            deleteButton.addEventListener('click', () => deleteTalent(talent.id));
            actionsCell.appendChild(deleteButton);
        }
    });

    clearFormAndErrors(); // This will only clear the form on index.html
}


// --- API Interaction Functions ---

// Function to fetch talents from the backend API (UPDATED for pagination & sorting)
async function fetchTalents() {
    // Only attempt to fetch talents if on index.html
    if (!window.location.pathname.includes('login.html')) {
        try {
            let url = new URL(API_BASE_URL);

            // Add filter and search parameters
            if (primarySkillFilter && primarySkillFilter.value && primarySkillFilter.value !== 'All Skills') {
                url.searchParams.append('primarySkill', primarySkillFilter.value);
            }
            if (minExperienceFilter && minExperienceFilter.value) {
                url.searchParams.append('minExperience', minExperienceFilter.value);
            }
            if (maxExperienceFilter && maxExperienceFilter.value) {
                url.searchParams.append('maxExperience', maxExperienceFilter.value);
            }
            if (searchInput && searchInput.value) {
                url.searchParams.append('search', searchInput.value.trim());
            }

            // Add pagination and sorting parameters
            url.searchParams.append('page', currentPage);
            url.searchParams.append('limit', itemsPerPage);
            url.searchParams.append('sort_by', currentSortColumn);
            url.searchParams.append('sort_direction', sortDirection);

            const response = await fetch(url, { credentials: 'include' });
            if (!response.ok) {
                // If the fetch fails for talents (e.g., due to session expiry or backend restart)
                // we should re-check login status which will then redirect if needed.
                if (response.status === 401 || response.status === 403) {
                     // Check login status again, which will handle the redirect
                    await checkLoginStatus();
                    return; // Prevent further execution of this fetch
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            renderTalentsTable(data.talents);

            updatePaginationControls(data.total_talents, data.page, data.limit, data.total_pages);

        } catch (error) {
            console.error('Error fetching talents:', error);
            showFeedback(`Error loading talents: ${error.message}`, 'error', formFeedback);
        }
    }
}

// Function to update pagination buttons and info
function updatePaginationControls(totalTalents, page, limit, totalPages) {
    if (pageInfoSpan) { // Only update if on the page with pagination controls
        pageInfoSpan.textContent = `Page ${page} of ${totalPages} (Total: ${totalTalents} talents)`;
    }

    if (prevPageBtn) prevPageBtn.disabled = (page === 1);
    if (nextPageBtn) nextPageBtn.disabled = (page === totalPages || totalPages === 0);
}

// Function to populate the primary skill filter dropdown
async function populateSkillFilter() {
    if (!primarySkillFilter) return; // Only populate if on the page with the filter

    try {
        const response = await fetch(`${API_BASE_URL}?limit=0`, { credentials: 'include' });
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                console.warn('Could not populate skill filter due to authentication. This is expected if viewing is restricted.');
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const allTalents = data.talents;

        const uniqueSkills = [...new Set(allTalents.map(talent => talent.primarySkill))];

        primarySkillFilter.innerHTML = '<option value="">All Skills</option>';
        uniqueSkills.sort().forEach(skill => {
            const option = document.createElement('option');
            option.value = skill;
            option.textContent = skill;
            primarySkillFilter.appendChild(option);
        });
    } catch (error) {
        console.error('Error populating skill filter:', error);
    }
}

// Function to handle form submission (Add or Edit)
async function handleFormSubmit(event) {
    event.preventDefault();
    clearInputErrors();

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const primarySkill = primarySkillInput.value.trim();
    const specificSkills = specificSkillsInput.value.trim();
    const yearsExperience = parseInt(yearsExperienceInput.value);

    let isValid = true;

    if (!name) {
        showInputError('name', 'Name is required.');
        isValid = false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
        showInputError('email', 'Email is required.');
        isValid = false;
    } else if (!emailRegex.test(email)) {
        showInputError('email', 'Invalid email format.');
        isValid = false;
    }

    if (!primarySkill) {
        showInputError('primarySkill', 'Primary Skill is required.');
        isValid = false;
    }

    if (isNaN(yearsExperience) || yearsExperience < 0) {
        showInputError('yearsExperience', 'Years Experience must be a non-negative number.');
        isValid = false;
    }

    if (!isValid) {
        showFeedback('Please correct the highlighted errors.', 'error', formFeedback);
        return;
    }

    const talentData = {
        name: name,
        email: email,
        primarySkill: primarySkill,
        specificSkills: specificSkills,
        yearsExperience: yearsExperience
    };

    try {
        let response;
        let method;
        let url;

        if (editingTalentId !== null) {
            method = 'PUT';
            url = `${API_BASE_URL}/${editingTalentId}`;
        } else {
            method = 'POST';
            url = API_BASE_URL;
        }

        response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(talentData),
            credentials: 'include'
        });

        if (response.status === 401 || response.status === 403) {
            const authError = await response.json();
            showFeedback(`Action failed: ${authError.error || response.statusText}. Please ensure you are logged in as an administrator.`, 'error', formFeedback);
            updateUIForAuth(false); // Reset UI to logged out state and trigger redirect
            return;
        }

        const result = await response.json();

        if (!response.ok) {
            if (response.status === 400 && result.errors) {
                let errorMessages = '';
                for (const field in result.errors) {
                    showInputError(field, result.errors[field]);
                    errorMessages += `${result.errors[field]}<br>`;
                }
                showFeedback(errorMessages || 'Please correct the errors in the form.', 'error', formFeedback);
            } else if (response.status === 409 && result.errors && result.errors.email) {
                showInputError('email', result.errors.email);
                showFeedback(result.errors.email, 'error', formFeedback);
            }
             else {
                showFeedback(`Error: ${result.error || response.statusText}`, 'error', formFeedback);
                console.error('API Error:', result);
            }
        } else {
            if (editingTalentId !== null) {
                showFeedback(`Talent updated successfully!`, 'success', formFeedback);
            } else {
                showFeedback('Talent added successfully!', 'success', formFeedback);
            }
            await fetchTalents();
            await populateSkillFilter();
            clearFormAndErrors();
        }
    } catch (error) {
        console.error('Network or API communication error:', error);
        showFeedback(`Failed to communicate with the server: ${error.message}`, 'error', formFeedback);
    }
}

// Function to handle editing a talent
async function editTalent(id) {
    editingTalentId = id;
    clearInputErrors();

    try {
        const response = await fetch(`${API_BASE_URL}/${id}`, { credentials: 'include' });
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                const authError = await response.json();
                showFeedback(`Cannot fetch talent for edit: ${authError.error || response.statusText}. Please ensure you are logged in.`, 'error', formFeedback);
                updateUIForAuth(false);
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const talentToEdit = await response.json();

        if (talentToEdit) {
            if (nameInput) nameInput.value = talentToEdit.name;
            if (emailInput) emailInput.value = talentToEdit.email;
            if (primarySkillInput) primarySkillInput.value = talentToEdit.primarySkill;
            if (specificSkillsInput) specificSkillsInput.value = talentToEdit.specificSkills;
            if (yearsExperienceInput) yearsExperienceInput.value = talentToEdit.yearsExperience;

            if (submitButton) {
                submitButton.textContent = 'Update Talent';
            }
            if (talentFormSection) talentFormSection.style.display = 'block';
            if (toggleFormButton) toggleFormButton.textContent = 'Hide Add Talent Form';
            showFeedback('', 'success', formFeedback);
        } else {
            showFeedback('Error: Talent data not retrieved for editing.', 'error', formFeedback);
        }
    } catch (error) {
        console.error('Error fetching talent for edit:', error);
        showFeedback(`Error loading talent data for edit: ${error.message}`, 'error', formFeedback);
    }
}

// Function to handle deleting a talent
async function deleteTalent(id) {
    if (!confirm(`Are you sure you want to delete talent with ID: ${id}? This action cannot be undone.`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (response.status === 401 || response.status === 403) {
            const authError = await response.json();
            showFeedback(`Deletion failed: ${authError.error || response.statusText}. Please ensure you are logged in as an administrator.`, 'error', formFeedback);
            updateUIForAuth(false);
            return;
        }

        const result = await response.json();

        if (!response.ok) {
            showFeedback(`Error: ${result.error || response.statusText}`, 'error', formFeedback);
            console.error('Delete API Error:', result);
        } else {
            showFeedback(`Talent with ID ${id} deleted successfully!`, 'success', formFeedback);
            const responseAfterDelete = await fetch(`${API_BASE_URL}?page=${currentPage}&limit=${itemsPerPage}&sort_by=${currentSortColumn}&sort_direction=${sortDirection}`, { credentials: 'include' });
            const dataAfterDelete = await responseAfterDelete.json();

            if (dataAfterDelete.talents.length === 0 && dataAfterDelete.total_pages > 0 && currentPage > 1) {
                currentPage--;
            }
            await fetchTalents();
            await populateSkillFilter();
        }
    } catch (error) {
        console.error('Network or API communication error during delete:', error);
        showFeedback(`Failed to delete talent: ${error.message}`, 'error', formFeedback);
    }
}

// Function to show talent details in a modal
async function showTalentDetails(id) {
    if (!talentDetailsModal) return; // Only show if modal exists

    try {
        const response = await fetch(`${API_BASE_URL}/${id}`, { credentials: 'include' });
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                showFeedback(`Could not load details: ${response.statusText}. You might need to login.`, 'error', formFeedback);
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const talent = await response.json();

        if (talent) {
            // Populate modal fields
            if (detailId) detailId.textContent = talent.id;
            if (detailName) detailName.textContent = talent.name;
            if (detailEmail) detailEmail.textContent = talent.email;
            if (detailPrimarySkill) detailPrimarySkill.textContent = talent.primarySkill;
            if (detailSpecificSkills) detailSpecificSkills.textContent = talent.specificSkills || 'N/A';
            if (detailYearsExperience) detailYearsExperience.textContent = talent.yearsExperience;

            talentDetailsModal.style.display = 'block'; // Show the modal
        } else {
            console.error('Talent data not found for ID:', id);
            showFeedback('Could not load talent details.', 'error', formFeedback);
        }
    } catch (error) {
        console.error('Error fetching talent details:', error);
        showFeedback(`Failed to load talent details: ${error.message}`, 'error', formFeedback);
    }
}

// Function to hide the talent details modal
function hideTalentDetails() {
    if (talentDetailsModal) {
        talentDetailsModal.style.display = 'none';
    }
}


// Handle user login (ONLY on login.html)
async function handleLogin(event) {
    event.preventDefault();
    if (!usernameInput || !passwordInput || !authFeedback) return; // Ensure elements exist

    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (!username || !password) {
        showFeedback('Please enter both username and password.', 'error', authFeedback);
        return;
    }

    try {
        const response = await fetch(`${AUTH_API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password }),
            credentials: 'include'
        });

        const result = await response.json();

        if (response.ok) {
            showFeedback(`Welcome, ${result.username}! Redirecting...`, 'success', authFeedback);
            // On successful login, immediately redirect to the main page
            window.location.href = 'index.html';
        } else {
            showFeedback(`Login failed: ${result.error || 'Invalid credentials.'}`, 'error', authFeedback);
            // No redirect on failed login, stay on login page
        }
    } catch (error) {
        console.error('Login error:', error);
        showFeedback(`Network error during login: ${error.message}`, 'error', authFeedback);
    }
}

// Handle user logout (ONLY on index.html)
async function handleLogout() {
    if (!logoutButton) return; // Ensure button exists

    try {
        const response = await fetch(`${AUTH_API_BASE_URL}/logout`, {
            method: 'POST',
            credentials: 'include'
        });

        const result = await response.json();

        if (response.ok) {
            showFeedback('You have been logged out. Redirecting...', 'success', formFeedback); // Show on index.html
            // On successful logout, redirect to login page
            window.location.href = 'login.html';
        } else {
            showFeedback(`Logout failed: ${result.error || 'Server error.'}`, 'error', formFeedback); // Show on index.html
        }
    } catch (error) {
        console.error('Logout error:', error);
        showFeedback(`Network error during logout: ${error.message}`, 'error', formFeedback);
    }
}

// Check current login status on page load
async function checkLoginStatus() {
    try {
        const response = await fetch(`${AUTH_API_BASE_URL}/status`, { credentials: 'include' });
        const result = await response.json();

        if (response.ok && result.is_authenticated) {
            updateUIForAuth(true, result.role, result.username);
        } else {
            updateUIForAuth(false); // Not authenticated, updateUIForAuth will handle redirects
        }
    } catch (error) {
        console.error('Failed to check login status:', error);
        updateUIForAuth(false); // Assume not authenticated on error, updateUIForAuth will handle redirects
    }
}


// --- Event Listeners for Filters and Search (ONLY on index.html) ---
if (primarySkillFilter) {
    primarySkillFilter.addEventListener('change', () => {
        currentPage = 1;
        fetchTalents();
    });
}
if (minExperienceFilter) {
    minExperienceFilter.addEventListener('input', () => {
        currentPage = 1;
        fetchTalents();
    });
}
if (maxExperienceFilter) {
    maxExperienceFilter.addEventListener('input', () => {
        currentPage = 1;
        fetchTalents();
    });
}
if (searchInput) {
    searchInput.addEventListener('input', () => {
        currentPage = 1;
        fetchTalents();
    });
}

// --- Event Listeners for Pagination (ONLY on index.html) ---
if (prevPageBtn) {
    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            fetchTalents();
        }
    });
}
if (nextPageBtn) {
    nextPageBtn.addEventListener('click', () => {
        currentPage++;
        fetchTalents();
    });
}

// --- Event Listeners for Sorting (ONLY on index.html) ---
if (tableHeaders) {
    tableHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const column = header.dataset.sort;

            if (currentSortColumn === column) {
                sortDirection = (sortDirection === 'asc' ? 'desc' : 'asc');
            } else {
                currentSortColumn = column;
                sortDirection = 'asc';
            }

            currentPage = 1;
            fetchTalents();
        });
    });
}

// Event listener for Export CSV button (ONLY on index.html)
if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', async () => {
        try {
            let exportUrl = new URL(`${AUTH_API_BASE_URL}/talents/export`);

            if (primarySkillFilter && primarySkillFilter.value && primarySkillFilter.value !== 'All Skills') {
                exportUrl.searchParams.append('primarySkill', primarySkillFilter.value);
            }
            if (minExperienceFilter && minExperienceFilter.value) {
                exportUrl.searchParams.append('minExperience', minExperienceFilter.value);
            }
            if (maxExperienceFilter && maxExperienceFilter.value) {
                exportUrl.searchParams.append('maxExperience', maxExperienceFilter.value);
            }
            if (searchInput && searchInput.value) {
                exportUrl.searchParams.append('search', searchInput.value.trim());
            }

            const response = await fetch(exportUrl, { credentials: 'include' });
            if (response.status === 401 || response.status === 403) {
                const authError = await response.json();
                showFeedback(`Export failed: ${authError.error || response.statusText}. Please ensure you are logged in as an administrator.`, 'error', formFeedback);
                updateUIForAuth(false);
                return;
            }
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = 'talents_export.csv';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            document.body.removeChild(a);

            showFeedback('CSV export started!', 'success', formFeedback);

        } catch (error) {
            console.error('Error exporting CSV:', error);
            showFeedback(`Error exporting CSV: ${error.message}`, 'error', formFeedback);
        }
    });
}


// Event listeners for Modal close button and clicking outside the modal (ONLY on index.html)
if (closeButton && talentDetailsModal) { // Check if elements exist
    closeButton.addEventListener('click', hideTalentDetails);

    window.addEventListener('click', (event) => {
        if (event.target === talentDetailsModal) {
            hideTalentDetails();
        }
    });
}


// Event listener for the talent form submission (ONLY on index.html)
if (talentForm) {
    talentForm.addEventListener('submit', handleFormSubmit);
}

// Event listener for toggle form button (ONLY on index.html)
if (toggleFormButton) {
    toggleFormButton.addEventListener('click', () => {
        if (talentFormSection && talentFormSection.style.display === 'none') {
            talentFormSection.style.display = 'block';
            toggleFormButton.textContent = 'Hide Add Talent Form';
        } else if (talentFormSection) {
            talentFormSection.style.display = 'none';
            toggleFormButton.textContent = 'Show Add Talent Form';
            clearFormAndErrors(); // Clear form when hiding
        }
    });
}


// Event listener for Login (ONLY on login.html)
if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
}
// Event listener for Logout (ONLY on index.html)
if (logoutButton) {
    logoutButton.addEventListener('click', handleLogout);
}


// Initial data load when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Check login status, this will handle redirects to login.html or update UI on index.html
    await checkLoginStatus();

    // 2. Based on updateUIForAuth's decision, if we are on index.html and authenticated,
    // then fetch talents and populate filters.
    // updateUIForAuth already calls fetchTalents if not on login.html and authenticated,
    // so we just need to ensure populateSkillFilter runs.
    const currentPath = window.location.pathname;
    if (!currentPath.includes('login.html') && isAuthenticated) {
        // fetchTalents is called by updateUIForAuth, so only populate filter if not already
        await populateSkillFilter();
    }
});