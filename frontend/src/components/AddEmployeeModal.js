import React, { useState, useEffect } from 'react';

function AddEmployeeModal({ isOpen, onClose, onSave, employeeToEdit }) {

    const [formData, setFormData] = useState({
        first_name: "",
        last_name: "",
        role: "employee",
        login: "",
        date_of_termination: ""
    });

    const [photoFile, setPhotoFile] = useState(null);

    useEffect(() => {
        if (isOpen) {
            setPhotoFile(null); // Reset zdjęcia przy otwarciu
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

        // Przygotowujemy obiekt ze wszystkim (dane + plik)
        // App.js zajmie się rozdzieleniem tego na dwa zapytania do API
        const finalData = {
            ...formData,
            // Jeśli data jest pusta, wysyłamy null (wymóg bazy SQL)
            date_of_termination: formData.date_of_termination === "" ? null : formData.date_of_termination,
            photo: photoFile // Doklejamy plik (może być null)
        };

        onSave(finalData);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>

                <h2>{employeeToEdit ? "✏️ Edytuj Pracownika" : "➕ Dodaj Nowego Pracownika"}</h2>

                <form onSubmit={handleSubmit}>
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

                    {/* --- Sekcja zdjęcia (Aktywna) --- */}
                    <div className="form-group" style={{border: '1px dashed #ccc', padding: '10px', marginTop: '10px'}}>
                        <label>📸 Zdjęcie twarzy (wymagane przez bramkę):</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setPhotoFile(e.target.files[0])}
                        />
                        {photoFile && <small style={{display:'block', color:'green'}}>Wybrano plik: {photoFile.name}</small>}
                    </div>

                    <div className="form-group">
                        <label>Data zwolnienia (opcjonalne):</label>
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