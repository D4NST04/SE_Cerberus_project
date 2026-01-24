import React, { useState, useEffect } from 'react';

// Dodajemy prop 'employeeToEdit' - jeśli istnieje, to znaczy że edytujemy
function AddEmployeeModal({ isOpen, onClose, onSave, employeeToEdit }) {

    const [formData, setFormData] = useState({
        first_name: "",
        last_name: "",
        role: "employee",
        login: "",
        termination_date: "" // NOWE POLE
    });

    // MAGIA: Ten kawałek kodu wykona się ZAWSZE, gdy otworzysz okno (zmieni się isOpen)
    // albo gdy zmienisz pracownika do edycji.
    useEffect(() => {
        if (isOpen) {
            if (employeeToEdit) {
                // TRYB EDYCJI: Wpisujemy dane istniejącego pracownika w pola
                setFormData({
                    first_name: employeeToEdit.first_name,
                    last_name: employeeToEdit.last_name,
                    role: employeeToEdit.role,
                    login: employeeToEdit.login,
                    termination_date: employeeToEdit.termination_date || "" // NOWE
                });
            } else {
                // TRYB DODAWANIA: Czyścimy pola
                setFormData({
                    first_name: "",
                    last_name: "",
                    role: "employee",
                    login: "",
                    termination_date: "" // NOWE
                });
            }
        }
    }, [isOpen, employeeToEdit]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData); // Wysyłamy dane do góry
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            {/* onClick na overlay zamyka modal (kliknięcie w tło) */}

            {/* stopPropagation sprawia, że kliknięcie w okienko NIE zamyka go */}
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>

                <h2>{employeeToEdit ? "✏️ Edytuj Pracownika" : "➕ Dodaj Nowego Pracownika"}</h2>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Imię:</label>
                        <input
                            type="text" required
                            value={formData.first_name}
                            onChange={e => setFormData({...formData, first_name: e.target.value})}
                        />
                    </div>

                    <div className="form-group">
                        <label>Nazwisko:</label>
                        <input
                            type="text" required
                            value={formData.last_name}
                            onChange={e => setFormData({...formData, last_name: e.target.value})}
                        />
                    </div>

                    <div className="form-group">
                        <label>Login:</label>
                        <input
                            type="text" required
                            value={formData.login}
                            onChange={e => setFormData({...formData, login: e.target.value})}
                        />
                    </div>

                    <div className="form-group">
                        <label>Rola:</label>
                        <select
                            value={formData.role}
                            onChange={e => setFormData({...formData, role: e.target.value})}
                        >
                            <option value="employee">Pracownik (Robol)</option>
                            <option value="manager">Kierownik (Biurowy)</option>
                            <option value="admin">Szef (Admin)</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Data wygaśnięcia konta (opcjonalne):</label>
                        <input
                            type="date"
                            value={formData.termination_date}
                            onChange={e => setFormData({...formData, termination_date: e.target.value})}
                        />
                    </div>

                    <div className="modal-actions">
                        <button type="button" onClick={onClose} className="btn-cancel">Anuluj</button>
                        <button type="submit" className="btn-save">
                            {employeeToEdit ? "Zapisz Zmiany" : "Dodaj"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AddEmployeeModal;