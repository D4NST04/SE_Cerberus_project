import React, { useState, useEffect } from 'react';

function AddEmployeeModal({ isOpen, onClose, onSave, employeeToEdit }) {

    const [formData, setFormData] = useState({
        first_name: "",
        last_name: "",
        role: "employee",
        login: "",
        date_of_termination: ""
    });

    // --- NOWE: Stan na plik ze zdjęciem ---
    const [photoFile, setPhotoFile] = useState(null);

    useEffect(() => {
        if (isOpen) {
            setPhotoFile(null); // Resetujemy zdjęcie przy otwarciu
            if (employeeToEdit) {
                setFormData({
                    first_name: employeeToEdit.first_name,
                    last_name: employeeToEdit.last_name,
                    role: employeeToEdit.role,
                    login: employeeToEdit.login || "",
                    date_of_termination: employeeToEdit.date_of_termination || ""
                });
            } else {
                setFormData({
                    first_name: "",
                    last_name: "",
                    role: "employee",
                    login: "",
                    date_of_termination: ""
                });
            }
        }
    }, [isOpen, employeeToEdit]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();

        // Wersja tymczasowa (ciekawe kim był ten tymczasow):
        const dataToSend = {
            ...formData,
            date_of_termination: formData.date_of_termination === "" ? null : formData.date_of_termination
        };
        onSave(dataToSend);

        /*
        // To odkomentuję jak będzie wszystko działało

        const dataPayload = new FormData();
        dataPayload.append("first_name", formData.first_name);
        dataPayload.append("last_name", formData.last_name);
        dataPayload.append("role", formData.role);
        if (formData.login) dataPayload.append("login", formData.login);
        if (formData.date_of_termination) dataPayload.append("date_of_termination", formData.date_of_termination);

        // Dodajemy plik, jeśli użytkownik go wybrał
        if (photoFile) {
            dataPayload.append("photo", photoFile);
        }

        // Wysyłamy obiekt FormData (onSave w App.js musi to obsłużyć)
        onSave(dataPayload);
        */
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>

                <h2>{employeeToEdit ? "✏️ Edytuj Pracownika" : "➕ Dodaj Nowego Pracownika"}</h2>

                <form onSubmit={handleSubmit}>
                    {/* --- INPUTY TEKSTOWE --- */}
                    <div className="form-group">
                        <label>Imię:</label>
                        <input type="text" required value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} />
                    </div>
                    <div className="form-group">
                        <label>Nazwisko:</label>
                        <input type="text" required value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} />
                    </div>
                    <div className="form-group">
                        <label>Login:</label>
                        <input type="text" required value={formData.login} onChange={e => setFormData({...formData, login: e.target.value})} />
                    </div>
                    <div className="form-group">
                        <label>Rola:</label>
                        <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                            <option value="employee">Pracownik</option>
                            <option value="manager">Kierownik</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>

                    {/* --- NOWE: Input na zdjęcie (widoczny, ale na razie opcjonalny) --- */}
                    <div className="form-group" style={{border: '1px dashed #ccc', padding: '10px', marginTop: '10px'}}>
                        <label>📸 Zdjęcie twarzy (do weryfikacji):</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setPhotoFile(e.target.files[0])}
                        />
                        <small style={{display:'block', color:'#666'}}>Wymagane do wejścia przez bramkę.</small>
                    </div>

                    <div className="form-group">
                        <label>Data wygaśnięcia (opcjonalne):</label>
                        <input type="date" value={formData.date_of_termination} onChange={e => setFormData({...formData, date_of_termination: e.target.value})} />
                    </div>

                    <div className="modal-actions">
                        <button type="button" onClick={onClose} className="btn-cancel">Anuluj</button>
                        <button type="submit" className="btn-save">{employeeToEdit ? "Zapisz" : "Dodaj"}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AddEmployeeModal;