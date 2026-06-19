document.addEventListener('DOMContentLoaded', () => {
    // Only run on simulator page
    if (!document.getElementById('num-qubits')) return;

    const numQubitsSlider = document.getElementById('num-qubits');
    const qubitCountVal = document.getElementById('qubit-count-val');
    const qubitsContainer = document.getElementById('qubits-container');
    const introErrorCheck = document.getElementById('introduce-error');
    const errorConfig = document.getElementById('error-config');
    const errorTargetSelect = document.getElementById('error-target');
    const simulateBtn = document.getElementById('simulate-btn');

    const loading = document.getElementById('loading');
    const resultsDisplay = document.getElementById('results-display');
    const welcomeBox = document.getElementById('welcome-box');

    // UI Updates
    function updateQubitToggles() {
        const count = parseInt(numQubitsSlider.value);
        qubitCountVal.textContent = count;
        
        // Save current states before recreating
        const currentStates = getQubitValues();
        
        qubitsContainer.innerHTML = '';
        errorTargetSelect.innerHTML = '';
        
        for (let i = 0; i < count; i++) {
            // Qubit row
            const val = currentStates[i] || 0;
            const checkedAttr = val === 1 ? 'checked' : '';
            
            const row = document.createElement('div');
            row.className = 'qubit-row';
            row.innerHTML = `
                <span style="font-weight: 500;">Qubit ${i}</span>
                <label class="toggle-switch">
                    <input type="checkbox" class="qubit-toggle" data-idx="${i}" ${checkedAttr}>
                    <span class="slider"></span>
                    <span class="val-display">${val}</span>
                </label>
            `;
            qubitsContainer.appendChild(row);

            // Error select option
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `Qubit ${i}`;
            errorTargetSelect.appendChild(option);
            
            // Add listener to update label
            const toggle = row.querySelector('.qubit-toggle');
            const display = row.querySelector('.val-display');
            toggle.addEventListener('change', (e) => {
                display.textContent = e.target.checked ? '1' : '0';
            });
        }
    }

    introErrorCheck.addEventListener('change', (e) => {
        if (e.target.checked) {
            errorConfig.style.display = 'block';
            // Slight animation for revealing
            errorConfig.style.opacity = '0';
            setTimeout(() => {
                errorConfig.style.transition = 'opacity 0.3s ease';
                errorConfig.style.opacity = '1';
            }, 10);
        } else {
            errorConfig.style.display = 'none';
        }
    });

    numQubitsSlider.addEventListener('input', updateQubitToggles);

    function getQubitValues() {
        const toggles = document.querySelectorAll('.qubit-toggle');
        const values = [];
        toggles.forEach(t => {
            values[parseInt(t.dataset.idx)] = t.checked ? 1 : 0;
        });
        return values;
    }

    simulateBtn.addEventListener('click', async () => {
        const numQubits = parseInt(numQubitsSlider.value);
        const values = getQubitValues();
        const errorQubit = introErrorCheck.checked ? parseInt(errorTargetSelect.value) : -1;

        const payload = {
            qubits: numQubits,
            values: values,
            error_qubit: errorQubit
        };

        // UI State
        welcomeBox.classList.add('hidden');
        resultsDisplay.classList.add('hidden');
        loading.classList.remove('hidden');
        simulateBtn.disabled = true;

        try {
            const response = await fetch('/api/simulate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (data.status === 'success') {
                const parityEl = document.getElementById('parity-result');
                parityEl.textContent = data.parity;
                // Update badge color based on result purely for aesthetics
                if (data.parity === 'EVEN') {
                    parityEl.style.background = 'linear-gradient(135deg, #10b981, #059669)';
                } else {
                    parityEl.style.background = 'linear-gradient(135deg, #f43f5e, #e11d48)';
                }

                document.getElementById('ancilla-meas').textContent = data.measured_state;
                document.getElementById('circuit-img').src = `data:image/png;base64,${data.circuit_image}`;
                
                loading.classList.add('hidden');
                resultsDisplay.classList.remove('hidden');
            } else {
                alert('Simulation failed: ' + (data.message || 'Check console for details.'));
                console.error(data);
                loading.classList.add('hidden');
                welcomeBox.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Simulation error. Ensure backend is running.');
            loading.classList.add('hidden');
            welcomeBox.classList.remove('hidden');
        } finally {
            simulateBtn.disabled = false;
        }
    });

    // Initial render
    updateQubitToggles();
});
