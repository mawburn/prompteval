const promptCache = {};
let currentResultData = null;

const resultSelect = document.getElementById('result-select');
const resultsBody = document.getElementById('results-body');
const similarityMethodSelect = document.getElementById('similarity-method');
const similarityMatrix = document.getElementById('similarity-matrix');

// Setup tab navigation
const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(button => {
  button.addEventListener('click', () => {
    // Remove active class from all buttons and content
    tabButtons.forEach(btn => btn.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));
    
    // Add active class to current button and corresponding content
    button.classList.add('active');
    const tabName = button.dataset.tab;
    document.querySelector(`.tab-content[data-tab="${tabName}"]`).classList.add('active');
    
    // If similarity tab is clicked, make sure to render it
    if (tabName === 'similarity' && currentResultData) {
      renderSimilarityMatrix(currentResultData);
    }
  });
});

async function loadResultFiles() {
  try {
    const response = await fetch('/api/results');
    const data = await response.json();
    
    resultSelect.innerHTML = '';
    data.files.forEach(file => {
      const option = document.createElement('option');
      option.value = file;
      option.textContent = file.replace('.json', '');
      resultSelect.appendChild(option);
    });
    
    if (data.files.length > 0) {
      loadResult(data.files[0]);
    }
  } catch (error) {
    console.error('Error loading result files:', error);
  }
}

async function getPromptContent(promptId) {
  if (promptCache[promptId]) {
    return promptCache[promptId];
  }
  
  try {
    const response = await fetch(`/api/prompts/${promptId}`);
    const data = await response.json();
    promptCache[promptId] = data.content;
    return data.content;
  } catch (error) {
    console.error(`Error fetching prompt ${promptId}:`, error);
    return 'Error loading prompt content';
  }
}

async function loadResult(filename) {
  try {
    resultsBody.innerHTML = '<tr><td colspan="2">Loading...</td></tr>';
    similarityMatrix.innerHTML = '<div class="loading">Loading...</div>';
    
    const response = await fetch(`/api/results/${filename}`);
    const data = await response.json();
    
    // Store the current result data for use in other tabs
    currentResultData = data;
    
    resultsBody.innerHTML = '';
    
    for (const [promptId, responses] of Object.entries(data.prompts)) {
      const promptContent = await getPromptContent(promptId);
      
      const headerRow = document.createElement('tr');
      headerRow.className = 'prompt-group';
      headerRow.innerHTML = `
        <td colspan="3">
          <strong>Prompt: ${promptId}</strong>
          <div class="prompt-content">${promptContent}</div>
        </td>
      `;
      resultsBody.appendChild(headerRow);
      
      for (const response of responses) {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${response.modelName}</td>
          <td class="response">${response.response}</td>
        `;
        resultsBody.appendChild(row);
      }
    }
    
    // If the similarity tab is active, render the similarity matrix
    if (document.querySelector('.tab-button[data-tab="similarity"]').classList.contains('active')) {
      renderSimilarityMatrix(data);
    }
  } catch (error) {
    console.error('Error loading result:', error);
    resultsBody.innerHTML = `<tr><td colspan="2">Error loading results: ${error.message}</td></tr>`;
    similarityMatrix.innerHTML = `<div class="error">Error loading similarity matrix: ${error.message}</div>`;
  }
}

function renderSimilarityMatrix(data) {
  if (!data.similarityMatrix) {
    similarityMatrix.innerHTML = '<div class="no-data">No similarity data available for this result set.</div>';
    return;
  }
  
  // Get all result IDs and create a lookup map for results
  const allResults = new Map();
  const resultIds = new Set();
  
  Object.entries(data.prompts).forEach(([promptId, responses]) => {
    responses.forEach(result => {
      if (!result.response.startsWith('ERROR:')) {
        resultIds.add(result.id);
        allResults.set(result.id, result);
      }
    });
  });
  
  // Convert to array and sort for consistent display
  const sortedResultIds = Array.from(resultIds).sort();
  
  // Get selected similarity method
  const method = similarityMethodSelect.value;
  
  // Create the matrix table
  const table = document.createElement('table');
  table.className = 'similarity-table';
  
  // Create header row
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  
  // Add empty corner cell
  const cornerCell = document.createElement('th');
  cornerCell.className = 'fixed-column top-left';
  cornerCell.textContent = 'Result';
  headerRow.appendChild(cornerCell);
  
  // Add header cells for each result
  sortedResultIds.forEach(resultId => {
    const result = allResults.get(resultId);
    const th = document.createElement('th');
    th.title = `${result.modelName} (${result.id})`;
    th.textContent = result.modelName;
    headerRow.appendChild(th);
  });
  
  thead.appendChild(headerRow);
  table.appendChild(thead);
  
  // Create table body
  const tbody = document.createElement('tbody');
  
  sortedResultIds.forEach((rowResultId, rowIndex) => {
    const rowResult = allResults.get(rowResultId);
    const tr = document.createElement('tr');
    
    // Add row header
    const rowHeader = document.createElement('td');
    rowHeader.className = 'fixed-column';
    rowHeader.textContent = rowResult.modelName;
    rowHeader.title = `${rowResult.modelName} (${rowResult.id})`;
    tr.appendChild(rowHeader);
    
    // Add cells for each comparison
    sortedResultIds.forEach((colResultId, colIndex) => {
      const td = document.createElement('td');
      
      if (rowResultId === colResultId) {
        // Diagonal cells (same result compared to itself)
        td.innerHTML = '<div class="similarity-value" style="background-color: #f5f7fa;">N/A</div>';
      } else {
        // Get the comparison key - ensure consistent ordering
        let comparisonKey;
        if (rowIndex < colIndex) {
          comparisonKey = `${rowResultId}_to_${colResultId}`;
        } else {
          comparisonKey = `${colResultId}_to_${rowResultId}`;
        }
        
        // Check if the keys don't exist in the expected format
        const comparison = data.similarityMatrix.comparisons[comparisonKey];
        
        // Try alternate formats if the expected one isn't found
        // This handles potentially different comparison key formats
        let score;
        if (comparison) {
          score = comparison[method];
        } else {
          // If no comparison was found using the standard formats, try to find any comparison 
          // involving both result IDs
          const alternateKey1 = `${rowResultId}_to_${colResultId}`;
          const alternateKey2 = `${colResultId}_to_${rowResultId}`;
          
          const alt1 = data.similarityMatrix.comparisons[alternateKey1];
          const alt2 = data.similarityMatrix.comparisons[alternateKey2];
          
          if (alt1) {
            score = alt1[method];
          } else if (alt2) {
            score = alt2[method];
          }
        }
        
        if (score !== undefined) {
          // Special case for exact 1.0 (perfect match) - use blue
          let backgroundColor, textColor;
          
          if (score === 1.0) {
            // Perfect match - use blue color
            backgroundColor = 'hsl(240, 85%, 45%)';
            textColor = 'white';
          } else {
            // Calculate hue on a scale from 0 (red) to 120 (green)
            // 0 = red (0% similarity), 60 = yellow (50% similarity), 120 = green (99% similarity)
            // This scales scores from 0-0.99 to the red-green spectrum
            const hue = Math.round((Math.min(score, 0.99) / 0.99) * 120);
            
            // Adjust saturation and lightness for better contrast with text
            let saturation = 85;
            let lightness = 45;
            
            // Yellow range needs special handling for contrast
            if (hue >= 50 && hue <= 70) {
              lightness = 40; // Make yellows darker for better text contrast
            }
            
            backgroundColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
            
            // Use white text for everything for better contrast
            textColor = 'white';
          }
          
          // Create the similarity value cell
          const valueDiv = document.createElement('div');
          valueDiv.className = 'similarity-value';
          valueDiv.style.backgroundColor = backgroundColor;
          valueDiv.style.color = textColor;
          valueDiv.textContent = score.toFixed(2);
          valueDiv.title = `Click to view details`;
          
          // Make it clickable to show details
          valueDiv.addEventListener('click', () => {
            // Find the actual comparison object to display
            const compObj = comparison || 
                          data.similarityMatrix.comparisons[alternateKey1] || 
                          data.similarityMatrix.comparisons[alternateKey2];
            showComparisonDetails(rowResult, allResults.get(colResultId), compObj);
          });
          
          td.appendChild(valueDiv);
        } else {
          // For true missing comparisons, create a value cell with '?'
          const valueDiv = document.createElement('div');
          valueDiv.className = 'similarity-value missing-comparison';
          valueDiv.style.backgroundColor = '#f0f0f0';
          valueDiv.textContent = '?';
          valueDiv.title = 'Missing comparison data';
          td.appendChild(valueDiv);
        }
      }
      
      tr.appendChild(td);
    });
    
    tbody.appendChild(tr);
  });
  
  table.appendChild(tbody);
  similarityMatrix.innerHTML = '';
  similarityMatrix.appendChild(table);
}

function showComparisonDetails(result1, result2, comparison) {
  // Create modal for detailed view
  const modal = document.createElement('div');
  modal.className = 'similarity-modal';
  modal.style.display = 'flex';
  
  const modalContent = document.createElement('div');
  modalContent.className = 'similarity-modal-content';
  
  // Add close button
  const closeButton = document.createElement('span');
  closeButton.className = 'close-modal';
  closeButton.innerHTML = '&times;';
  closeButton.addEventListener('click', () => modal.remove());
  modalContent.appendChild(closeButton);
  
  // Add title
  const title = document.createElement('h2');
  title.textContent = `Comparison Details: ${result1.modelName} vs ${result2.modelName}`;
  modalContent.appendChild(title);
  
  // Add similarity scores
  const scoreDetails = document.createElement('div');
  scoreDetails.className = 'similarity-details';
  scoreDetails.innerHTML = `
    <p><strong>Cosine Similarity:</strong> ${comparison.cosine.toFixed(4)}</p>
    <p><strong>Jaccard Similarity:</strong> ${comparison.jaccard.toFixed(4)}</p>
    <p><strong>Levenshtein Similarity:</strong> ${comparison.levenshtein.toFixed(4)}</p>
    <p><strong>Average Similarity:</strong> ${comparison.average.toFixed(4)}</p>
  `;
  modalContent.appendChild(scoreDetails);
  
  // Add response comparison
  const responseComparison = document.createElement('div');
  responseComparison.className = 'response-comparison';
  
  // Response 1
  const response1 = document.createElement('div');
  response1.className = 'response-column';
  response1.innerHTML = `
    <h3>${result1.modelName}</h3>
    <p>${result1.response}</p>
  `;
  responseComparison.appendChild(response1);
  
  // Response 2
  const response2 = document.createElement('div');
  response2.className = 'response-column';
  response2.innerHTML = `
    <h3>${result2.modelName}</h3>
    <p>${result2.response}</p>
  `;
  responseComparison.appendChild(response2);
  
  modalContent.appendChild(responseComparison);
  modal.appendChild(modalContent);
  document.body.appendChild(modal);
  
  // Close when clicking outside the modal content
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

resultSelect.addEventListener('change', (e) => {
  loadResult(e.target.value);
});

similarityMethodSelect.addEventListener('change', () => {
  if (currentResultData) {
    renderSimilarityMatrix(currentResultData);
  }
});

loadResultFiles();