from flask import Flask, render_template, request, jsonify
from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import base64
import io

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/simulator')
def simulator():
    return render_template('simulator.html')

@app.route('/api/simulate', methods=['POST'])
def simulate():
    try:
        data = request.json
        num_qubits = data.get('qubits', 2)
        qubit_values = data.get('values', [0]*num_qubits)
        error_qubit = data.get('error_qubit', -1) # -1 means no error
        
        # We need num_qubits data qubits, 1 ancilla qubit, and 1 classical bit for measurement
        qc = QuantumCircuit(num_qubits + 1, 1)
        
        # Initialize data qubits
        for i in range(num_qubits):
            if qubit_values[i] == 1:
                qc.x(i)
        
        qc.barrier(label="Initialize")
        
        # Optional Random Error
        if 0 <= error_qubit < num_qubits:
            qc.x(error_qubit) # Flip the bit to simulate an error
            qc.barrier(label="Error")
            
        # Parity Check Circuit
        ancilla_idx = num_qubits
        for i in range(num_qubits):
            qc.cx(i, ancilla_idx)
            
        qc.barrier(label="Measure")
        
        # Measure the ancilla
        qc.measure(ancilla_idx, 0)
        
        # Simulate
        simulator = AerSimulator()
        compiled_circuit = transpile(qc, simulator)
        job = simulator.run(compiled_circuit, shots=1)
        result = job.result()
        counts = result.get_counts()
        
        # Parity is the measured state of the ancilla
        measured_state = list(counts.keys())[0]
        parity = "ODD" if measured_state == "1" else "EVEN"
        
        # Generate Circuit Diagram
        fig = qc.draw(output='mpl', style="clifford")
        buf = io.BytesIO()
        fig.savefig(buf, format='png', bbox_inches="tight")
        buf.seek(0)
        circuit_b64 = base64.b64encode(buf.read()).decode('utf-8')
        plt.close(fig)
        
        return jsonify({
            "status": "success",
            "parity": parity,
            "measured_state": measured_state,
            "circuit_image": circuit_b64
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
