import React from 'react';

// Ten komponent przyjmuje listę pracowników i funkcje do obsługi przycisków
function EmployeeTable({ employees, onDelete, onGenerateQR, onEdit }) {

    return (
        <div className="table-container">
            <div className="header-actions">
                <h2>Lista Pracowników</h2>
                {/* Przycisk dodawania jest w App.js, tutaj wyświetlamy tylko listę */}
            </div>
            <table className="employee-table">
                <thead>
                <tr>
                    <th>ID</th>
                    <th>Zdjęcie</th>
                    <th>Pracownik</th>
                    <th>Rola</th>
                    <th>Akcje</th>
                </tr>
                </thead>
                <tbody>
                {employees.map((emp) => (
                    <tr key={emp.id_person}>
                        <td>{emp.id_person}</td>
                        <td><div className="avatar-placeholder">{emp.first_name[0]}{emp.last_name[0]}</div></td>
                        <td>
                            <div>{emp.first_name} {emp.last_name}</div>
                            <div style={{fontSize: '0.8em', color: '#666'}}>{emp.login}</div>
                        </td>
                        <td><span className={`badge badge-${emp.role}`}>{emp.role.toUpperCase()}</span></td>
                        <td>
                            <button title="Generuj QR" onClick={() => onGenerateQR(emp.id_person)}>📱</button>
                            <button title="Edytuj" onClick={() => onEdit(emp)}>✏️</button>
                            <button title="Zwolnij" className="btn-delete" onClick={() => onDelete(emp.id_person)}>❌</button>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}

export default EmployeeTable;