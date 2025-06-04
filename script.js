// script.js

// DOM elements
const toggleFormButton = document.getElementById('toggleFormButton');
const talentFormSection = document.getElementById('talentFormSection');
const talentTableBody = document.querySelector('#talentTable tbody');
const talentForm = document.getElementById('talentForm');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const primarySkillInput = document.getElementById('primarySkill');
const specificSkillsInput = document.getElementById('specificSkills');
const yearsExperienceInput = document.getElementById('yearsExperience');
const submitButton = talentForm.querySelector('button[type="submit"]');
const formFeedback = document.getElementById('formFeedback');
const primarySkillFilter = document.getElementById('primarySkillFilter');
const minExperienceFilter = document.getElementById('minExperienceFilter');
const maxExperienceFilter = document.getElementById('maxExperienceFilter');
const searchInput = document.getElementById('searchInput');

// Pagination & Sorting DOM elements
const prevPageBtn = document.getElementById('prevPageBtn');
const nextPageBtn = document.getElementById('nextPageBtn');
const pageInfoSpan = document.getElementById('pageInfo');
const tableHeaders = document.querySelectorAll('#talentTable th[data-sort]');

// Export button DOM element
const exportCsvBtn = document.getElementById('exportCsvBtn');

// Talent Details Modal DOM elements
const talentDetailsModal = document.getElementById('talentDetailsModal');
const closeButton = talentDetailsModal.querySelector('.close-button');
const detailId = document.getElementById('detailId');
const detailName = document.getElementById('detailName');
const detailEmail = document.getElementById('detailEmail');
const detailPrimarySkill = document.getElementById('detailPrimarySkill');
const detailSpecificSkills = document.getElementById('detailSpecificSkills');
const detailYearsExperience = document.getElementById('yearsExperience'); // Corrected typo here, should be detailYearsExperience


// NEW: Authentication DOM elements
const loginFormArea = document.getElementById('loginFormArea');
const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const authFeedback = document.getElementById('authFeedback');
const loggedInStatus = document.getElementById('loggedInStatus');
const currentUserSpan = document.getElementById('currentUser');
const currentUserRoleSpan = document.getElementById('currentUserRole');
const logoutButton = document.getElementById('logoutButton');
const authSection = document.getElementById('authSection'); // Reference to the entire auth section


// Frontend state variables
let editingTalentId = null;

// Pagination & Sorting state variables
let currentPage = 1;
const itemsPerPage = 5;
let currentSortColumn = 'id';
let sortDirection = 'asc';

// NEW: User authentication state
let isAuthenticated = false;
let currentUserRole = 'guest'; // 'guest', 'user', 'admin'


// Base URL for your Flask API
const API_BASE_URL = 'https://talent-management-app-9e8m.onrender.com'; // Use your actual Render backend URL
const AUTH_API_BASE_URL = 'https://talent-management-app-9e8m.onrender.com'; // Use your actual Render backend URL

// Initially hide the form section
talentFormSection.style.display = 'none';
toggleFormButton.style.display = 'none'; // Hide toggle button initially


// --- Helper Functions ---

// Function to display general feedback messages to the user (can be for form or auth)
function showFeedback(message, type = 'success', targetElement = formFeedback) {
    targetElement.innerHTML = message;
    targetElement.className = `feedback-message ${type} show`; // Add 'show' class for visibility
    setTimeout(() => {
        targetElement.style.opacity = 0;
        // After transition, remove 'show' class and clear content
        targetElement.addEventListener('transitionend', function handler() {
            if (targetElement.style.opacity == 0) { // Check if opacity is actually 0 after transition
                targetElement.textContent = '';
                targetElement.className = 'feedback-message';
                targetElement.removeEventListener('transitionend', handler);
            }
        });
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

// Function to clear the form and reset editing state/feedback
function clearFormAndErrors() {
    editingTalentId = null;
    if (talentForm) {
        talentForm.reset();
        submitButton.textContent = 'Add Talent';
    }
    clearInputErrors();
    formFeedback.textContent = '';
    formFeedback.className = 'feedback-message';
    formFeedback.style.opacity = 0;
}

// NEW: Function to update UI based on authentication status and role
function updateUIForAuth(authenticated, role = 'guest', username = 'Guest') {
    isAuthenticated = authenticated;
    currentUserRole = role;

    currentUserSpan.textContent = username;
    currentUserRoleSpan.textContent = role;

    if (isAuthenticated) {
        loginFormArea.style.display = 'none';
        logoutButton.style.display = 'inline-block';
        loggedInStatus.style.display = 'block';

        // Only show Add Talent form and toggle button if admin
        if (currentUserRole === 'admin') {
            toggleFormButton.style.display = 'block';
            talentFormSection.style.display = 'none'; // Keep it collapsed initially
        } else {
            toggleFormButton.style.display = 'none';
            talentFormSection.style.display = 'none'; // Hide add form for non-admins
        }
        exportCsvBtn.style.display = (currentUserRole === 'admin') ? 'block' : 'none';

    } else {
        loginFormArea.style.display = 'block';
        logoutButton.style.display = 'none';
        loggedInStatus.style.display = 'none';
        toggleFormButton.style.display = 'none';
        talentFormSection.style.display = 'none';
        exportCsvBtn.style.display = 'none';
    }

    // Re-render the table to show/hide action buttons based on role
    fetchTalents();
}


// Function to render the talents into the HTML table (UPDATED for View Details button and conditional action buttons)
function renderTalentsTable(talentsToRender) {
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

        // View Details Button (always visible)
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

    clearFormAndErrors();
}


// --- API Interaction Functions ---

// Function to fetch talents from the backend API (UPDATED for pagination & sorting)
async function fetchTalents() {
    try {
        let url = new URL(API_BASE_URL);

        // Add filter and search parameters
        if (primarySkillFilter.value && primarySkillFilter.value !== 'All Skills') {
            url.searchParams.append('primarySkill', primarySkillFilter.value);
        }
        if (minExperienceFilter.value) {
            url.searchParams.append('minExperience', minExperienceFilter.value);
        }
        if (maxExperienceFilter.value) {
            url.searchParams.append('maxExperience', maxExperienceFilter.value);
        }
        if (searchInput.value) {
            url.searchParams.append('search', searchInput.value.trim());
        }

        // Add pagination and sorting parameters
        url.searchParams.append('page', currentPage);
        url.searchParams.append('limit', itemsPerPage);
        url.searchParams.append('sort_by', currentSortColumn);
        url.searchParams.append('sort_direction', sortDirection);


        const response = await fetch(url, { credentials: 'include' }); // ADDED credentials: 'include'
        if (!response.ok) {
            // Check for 401/403 responses from API routes that are now protected
            if (response.status === 401 || response.status === 403) {
                // For now, we allow viewing without login, so this branch should ideally not be hit unless you uncommented @login_required
                // If you uncommented @login_required on get_all_talents, this would trigger.
                showFeedback(`Error loading talents: ${response.statusText}. Please login.`, 'error');
                updateUIForAuth(false); // Reset UI to logged out state
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        renderTalentsTable(data.talents);

        updatePaginationControls(data.total_talents, data.page, data.limit, data.total_pages);

    } catch (error) {
        console.error('Error fetching talents:', error);
        showFeedback(`Error loading talents: ${error.message}`, 'error');
    }
}

// Function to update pagination buttons and info
function updatePaginationControls(totalTalents, page, limit, totalPages) {
    pageInfoSpan.textContent = `Page ${page} of ${totalPages} (Total: ${totalTalents} talents)`;

    prevPageBtn.disabled = (page === 1);
    nextPageBtn.disabled = (page === totalPages || totalPages === 0);
}

// Function to populate the primary skill filter dropdown
async function populateSkillFilter() {
    try {
        const response = await fetch(`${API_BASE_URL}?limit=0`, { credentials: 'include' }); // ADDED credentials: 'include'
        if (!response.ok) {
            // No need to show error for skill filter if it's due to login (as view is allowed)
            // But if it's a different error, handle it.
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
        showFeedback('Please correct the highlighted errors.', 'error');
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
            credentials: 'include' // ADDED credentials: 'include'
        });

        // NEW: Check for authentication/authorization errors
        if (response.status === 401 || response.status === 403) {
            const authError = await response.json();
            showFeedback(`Action failed: ${authError.error || response.statusText}. Please ensure you are logged in as an administrator.`, 'error');
            updateUIForAuth(false); // Reset UI to logged out state
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
                showFeedback(errorMessages || 'Please correct the errors in the form.', 'error');
            } else if (response.status === 409 && result.errors && result.errors.email) {
                showInputError('email', result.errors.email);
                showFeedback(result.errors.email, 'error');
            }
             else {
                showFeedback(`Error: ${result.error || response.statusText}`, 'error');
                console.error('API Error:', result);
            }
        } else {
            if (editingTalentId !== null) {
                showFeedback(`Talent updated successfully!`);
            } else {
                showFeedback('Talent added successfully!');
            }
            await fetchTalents();
            await populateSkillFilter();
            clearFormAndErrors();
        }
    } catch (error) {
        console.error('Network or API communication error:', error);
        showFeedback(`Failed to communicate with the server: ${error.message}`, 'error');
    }
}

// Function to handle editing a talent
async function editTalent(id) {
    editingTalentId = id;
    clearInputErrors();

    try {
        const response = await fetch(`${API_BASE_URL}/${id}`, { credentials: 'include' }); // ADDED credentials: 'include'
        if (!response.ok) {
            // If fetching for edit fails due to auth, user's session may have expired
            if (response.status === 401 || response.status === 403) {
                const authError = await response.json();
                showFeedback(`Cannot fetch talent for edit: ${authError.error || response.statusText}. Please ensure you are logged in.`, 'error');
                updateUIForAuth(false);
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const talentToEdit = await response.json();

        if (talentToEdit) {
            nameInput.value = talentToEdit.name;
            emailInput.value = talentToEdit.email;
            primarySkillInput.value = talentToEdit.primarySkill;
            specificSkillsInput.value = talentToEdit.specificSkills;
            yearsExperienceInput.value = talentToEdit.yearsExperience;

            if (submitButton) {
                submitButton.textContent = 'Update Talent';
            }
            talentFormSection.style.display = 'block';
            toggleFormButton.textContent = 'Hide Add Talent Form';
            showFeedback('', 'success');
        } else {
            showFeedback('Error: Talent data not retrieved for editing.', 'error');
        }
    } catch (error) {
        console.error('Error fetching talent for edit:', error);
        showFeedback(`Error loading talent data for edit: ${error.message}`, 'error');
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
            credentials: 'include' // ADDED credentials: 'include'
        });

        // NEW: Check for authentication/authorization errors
        if (response.status === 401 || response.status === 403) {
            const authError = await response.json();
            showFeedback(`Deletion failed: ${authError.error || response.statusText}. Please ensure you are logged in as an administrator.`, 'error');
            updateUIForAuth(false); // Reset UI to logged out state
            return;
        }

        const result = await response.json();

        if (!response.ok) {
            showFeedback(`Error: ${result.error || response.statusText}`, 'error');
            console.error('Delete API Error:', result);
        } else {
            showFeedback(`Talent with ID ${id} deleted successfully!`);
            const responseAfterDelete = await fetch(`${API_BASE_URL}?page=${currentPage}&limit=${itemsPerPage}&sort_by=${currentSortColumn}&sort_direction=${sortDirection}`, { credentials: 'include' }); // ADDED credentials: 'include'
            const dataAfterDelete = await responseAfterDelete.json();

            if (dataAfterDelete.talents.length === 0 && dataAfterDelete.total_pages > 0 && currentPage > 1) {
                currentPage--;
            }
            await fetchTalents();
            await populateSkillFilter();
        }
    } catch (error) {
        console.error('Network or API communication error during delete:', error);
        showFeedback(`Failed to delete talent: ${error.message}`, 'error');
    }
}

// Function to show talent details in a modal
async function showTalentDetails(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/${id}`, { credentials: 'include' }); // ADDED credentials: 'include'
        if (!response.ok) {
            // For view details, we don't necessarily want to log out, just show error
            // If you uncommented @login_required for get_talent_by_id, this would trigger
            if (response.status === 401 || response.status === 403) {
                showFeedback(`Could not load details: ${response.statusText}. You might need to login.`, 'error');
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const talent = await response.json();

        if (talent) {
            // Populate modal fields
            detailId.textContent = talent.id;
            detailName.textContent = talent.name;
            detailEmail.textContent = talent.email;
            detailPrimarySkill.textContent = talent.primarySkill;
            detailSpecificSkills.textContent = talent.specificSkills || 'N/A';
            detailYearsExperience.textContent = talent.yearsExperience;

            talentDetailsModal.style.display = 'block'; // Show the modal
        } else {
            console.error('Talent data not found for ID:', id);
            showFeedback('Could not load talent details.', 'error');
        }
    } catch (error) {
        console.error('Error fetching talent details:', error);
        showFeedback(`Failed to load talent details: ${error.message}`, 'error');
    }
}

// Function to hide the talent details modal
function hideTalentDetails() {
    talentDetailsModal.style.display = 'none';
}


// NEW: Handle user login
async function handleLogin(event) {
    event.preventDefault();
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
            credentials: 'include' // ADDED credentials: 'include'
        });

        const result = await response.json();

        if (response.ok) {
            showFeedback(`Welcome, ${result.username}! You are logged in as ${result.role}.`, 'success', authFeedback);
            updateUIForAuth(true, result.role, result.username);
            usernameInput.value = ''; // Clear form
            passwordInput.value = ''; // Clear form
        } else {
            showFeedback(`Login failed: ${result.error || 'Invalid credentials.'}`, 'error', authFeedback);
            updateUIForAuth(false); // Ensure UI reflects logged out state
        }
    } catch (error) {
        console.error('Login error:', error);
        showFeedback(`Network error during login: ${error.message}`, 'error', authFeedback);
    }
}

// NEW: Handle user logout
async function handleLogout() {
    try {
        const response = await fetch(`${AUTH_API_BASE_URL}/logout`, {
            method: 'POST',
            credentials: 'include' // ADDED credentials: 'include'
        });

        const result = await response.json();

        if (response.ok) {
            showFeedback('You have been logged out.', 'success', authFeedback);
            updateUIForAuth(false); // Reset UI to logged out state
        } else {
            showFeedback(`Logout failed: ${result.error || 'Server error.'}`, 'error', authFeedback);
        }
    } catch (error) {
        console.error('Logout error:', error);
        showFeedback(`Network error during logout: ${error.message}`, 'error', authFeedback);
    }
}

// NEW: Check current login status on page load
async function checkLoginStatus() {
    try {
        const response = await fetch(`${AUTH_API_BASE_URL}/status`, { credentials: 'include' }); // ADDED credentials: 'include'
        const result = await response.json();

        if (response.ok && result.is_authenticated) {
            updateUIForAuth(true, result.role, result.username);
        } else {
            updateUIForAuth(false); // Not authenticated, show login form
        }
    } catch (error) {
        console.error('Failed to check login status:', error);
        updateUIForAuth(false); // Assume not authenticated on error
    }
}


// --- Event Listeners for Filters and Search ---
primarySkillFilter.addEventListener('change', () => {
    currentPage = 1;
    fetchTalents();
});
minExperienceFilter.addEventListener('input', () => {
    currentPage = 1;
    fetchTalents();
});
maxExperienceFilter.addEventListener('input', () => {
    currentPage = 1;
    fetchTalents();
});
searchInput.addEventListener('input', () => {
    currentPage = 1;
    fetchTalents();
});

// --- Event Listeners for Pagination ---
prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        fetchTalents();
    }
});

nextPageBtn.addEventListener('click', () => {
    currentPage++;
    fetchTalents();
});

// --- Event Listeners for Sorting ---
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

// Event listener for Export CSV button
exportCsvBtn.addEventListener('click', async () => {
    try {
        let exportUrl = new URL(`${AUTH_API_BASE_URL}/talents/export`);

        if (primarySkillFilter.value && primarySkillFilter.value !== 'All Skills') {
            exportUrl.searchParams.append('primarySkill', primarySkillFilter.value);
        }
        if (minExperienceFilter.value) {
            exportUrl.searchParams.append('minExperience', minExperienceFilter.value);
        }
        if (maxExperienceFilter.value) {
            exportUrl.searchParams.append('maxExperience', maxExperienceFilter.value);
        }
        if (searchInput.value) {
            exportUrl.searchParams.append('search', searchInput.value.trim());
        }

        const response = await fetch(exportUrl, { credentials: 'include' }); // ADDED credentials: 'include'
        if (response.status === 401 || response.status === 403) {
            const authError = await response.json();
            showFeedback(`Export failed: ${authError.error || response.statusText}. Please ensure you are logged in as an administrator.`, 'error');
            updateUIForAuth(false);
            return;
        }
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // If successful, create a blob and download link
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = 'talents_export.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        document.body.removeChild(a);

        showFeedback('CSV export started!', 'success');

    } catch (error) {
        console.error('Error exporting CSV:', error);
        showFeedback(`Error exporting CSV: ${error.message}`, 'error');
    }
});


// Event listeners for Modal close button and clicking outside the modal
closeButton.addEventListener('click', hideTalentDetails);

window.addEventListener('click', (event) => {
    if (event.target === talentDetailsModal) {
        hideTalentDetails();
    }
});

// Event listener for the form submission
if (talentForm) {
    talentForm.addEventListener('submit', handleFormSubmit);
}

// NEW: Event listener for toggle form button
toggleFormButton.addEventListener('click', () => {
    if (talentFormSection.style.display === 'none') {
        talentFormSection.style.display = 'block';
        toggleFormButton.textContent = 'Hide Add Talent Form';
    } else {
        talentFormSection.style.display = 'none';
        toggleFormButton.textContent = 'Show Add Talent Form';
        clearFormAndErrors(); // Clear form when hiding
    }
});


// NEW: Event listeners for Login/Logout
if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
}
if (logoutButton) {
    logoutButton.addEventListener('click', handleLogout);
}

// Initial data load when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', async () => {
    // The checkLoginStatus() call now includes credentials: 'include'
    await checkLoginStatus(); // Check login status first
    // fetchTalents() and populateSkillFilter() are also updated to include credentials: 'include'
    await fetchTalents(); // Then fetch talents (will be filtered by auth status in renderTalentsTable)
    await populateSkillFilter(); // Populate skill filter
});