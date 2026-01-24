import React, { useState, useEffect } from 'react';

function AddEmployeeModal({ isOpen, onClose, onSave, employeeToEdit }) {

    const [formData, setFormData] = useState({
        first_name: "",
        last_name: "",
        role: "employee",
        login: "",
        date_of_termination: "" // Zmienione na zgodne z bazą danych
    });

    // Osobny stan na plik zdjęcia
    const [photoFile, setPhotoFile] = useState(null);

    useEffect(() => {
        if (isOpen) {
            setPhotoFile(null); // Reset zdjęcia przy każdym otwarciu okna

            if (employeeToEdit) {
                // TRYB EDYCJI
                setFormData({
                    first_name: employeeToEdit.first_name,
                    last_name: employeeToEdit.last_name,
                    role: employeeToEdit.role,
                    // Login może być null w bazie, więc dajemy pusty string w razie czego
                    login: employeeToEdit.login || "",
                    // Data też może być null
                    date_of_termination: employeeToEdit.date_of_termination || ""
                });
            } else {
                // TRYB DODAWANIA
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

        // Pakujemy wszystko w jeden obiekt
        const finalData = {
            ...formData,
            // Jeśli data jest pusta, wysyłamy null (żeby SQL nie zgłaszał błędu formatu)
            date_of_termination: formData.date_of_termination === "" ? null : formData.date_of_termination,
            photo: photoFile // Doklejamy plik (może być null, jeśli nie wybrano)
        };

        // Wysyłamy do App.js (tam funkcja handleSaveEmployee to obsłuży)
        onSave(finalData);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>

                <h2>{employeeToEdit ? "✏️ Edytuj Pracownika" : "➕ Dodaj Nowego Pracownika"}</h2>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Imię:</label>
                        <input
                            type="text"
                            required
                            value={formData.first_name}
                            onChange={e => setFormData({...formData, first_name: e.target.value})}
                        />
                    </div>

                    <div className="form-group">
                        <label>Nazwisko:</label>
                        <input
                            type="text"
                            required
                            value={formData.last_name}
                            onChange={e => setFormData({...formData, last_name: e.target.value})}
                        />
                    </div>

                    <div className="form-group">
                        <label>Login:</label>
                        <input
                            type="text"
                            required
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
                            <option value="employee">Pracownik</option>
                            <option value="manager">Kierownik</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>

                    {/* --- Sekcja zdjęcia --- */}
                    <div className="form-group" style={{border: '2px dashed #ccc', padding: '15px', borderRadius: '8px', marginTop: '10px', backgroundColor: '#f9f9f9'}}>
                        <label style={{fontWeight: 'bold'}}>📸 Zdjęcie twarzy (do weryfikacji):</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setPhotoFile(e.target.files[0])}
                            style={{marginTop: '5px'}}
                        />
                        {photoFile && <small style={{display:'block', color:'green', marginTop: '5px'}}>Wybrano plik: {photoFile.name}</small>}
                        {!photoFile && employeeToEdit && <small style={{display:'block', color:'#666', marginTop: '5px'}}>Pozostaw puste, aby zachować obecne zdjęcie.</small>}
                    </div>

                    <div className="form-group">
                        <label>Data zwolnienia (opcjonalne):</label>
                        <input
                            type="date"
                            value={formData.date_of_termination}
                            onChange={e => setFormData({...formData, date_of_termination: e.target.value})}
                        />
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