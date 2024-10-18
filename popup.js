let emails = [];
let scraping = false;
let lastEmailCount = 0;

// Restore email content when popup is opened
document.addEventListener('DOMContentLoaded', () => {
  const emailBox = document.getElementById('email-box');
  emailBox.value = localStorage.getItem('emails') || ''; // Load emails from local storage
});

// Start Scraping Functionality
document.getElementById('start-btn').addEventListener('click', () => {
  if (!scraping) {
    scraping = true;
    document.getElementById('progress-bar').value = 0;
    document.getElementById('progress-text').innerText = '0%';
    emails = localStorage.getItem('emails') ? localStorage.getItem('emails').split('\n') : []; // Load existing emails from local storage
    scrapeEmails();
  }
});

// Stop Scraping
document.getElementById('stop-btn').addEventListener('click', () => {
  scraping = false;
});

// Clear Emails
document.getElementById('clear-btn').addEventListener('click', () => {
  emails = [];
  localStorage.removeItem('emails'); // Clear from local storage
  document.getElementById('email-box').value = '';
  document.getElementById('progress-bar').value = 0;
  document.getElementById('progress-text').innerText = '0%';
});

// Copy Emails
document.getElementById('copy-btn').addEventListener('click', () => {
  const emailBox = document.getElementById('email-box');
  emailBox.select();
  document.execCommand('copy');
  alert('Emails copied to clipboard!');
});

// Export Emails as CSV
document.getElementById('export-btn').addEventListener('click', () => {
  const emailContent = localStorage.getItem('emails');
  if (emailContent) {
    const csvContent = "data:text/csv;charset=utf-8," + emailContent;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "scraped_emails.csv");
    document.body.appendChild(link); // Required for FF
    link.click();
    document.body.removeChild(link);
  } else {
    alert("No emails to export.");
  }
});

// Scrape Emails Function
function scrapeEmails() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      function: extractEmails
    }, (results) => {
      if (results && results[0] && results[0].result) {
        const newEmails = [...new Set([...results[0].result])];
        const uniqueNewEmails = newEmails.filter(email => !emails.includes(email));

        if (uniqueNewEmails.length > 0) {
          emails = [...new Set([...emails, ...uniqueNewEmails])];
          localStorage.setItem('emails', emails.join('\n')); // Save emails to local storage
          document.getElementById('email-box').value = emails.join('\n'); // Update the email box with all emails
        }

        // Detect change in email count to stop scraping if no new emails are found
        if (uniqueNewEmails.length === 0 && lastEmailCount === emails.length) {
          alert("No new emails found. Stopping scraping.");
          scraping = false;
        }
        lastEmailCount = emails.length;
        updateProgress();
      }

      if (scraping) {
        setTimeout(scrapeEmails, 1000); // Continue scraping every second
      }
    });
  });
}

// Update Progress Bar
function updateProgress() {
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');
  const progress = Math.min(100, (emails.length / 100) * 100); // Estimate max 100 emails
  progressBar.value = progress;
  progressText.innerText = `${Math.round(progress)}%`;
}

// Extract Emails from the current page
function extractEmails() {
  const bodyText = document.body.innerText;
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  return bodyText.match(emailRegex) || [];
}
