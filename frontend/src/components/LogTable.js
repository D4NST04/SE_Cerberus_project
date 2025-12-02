import React from 'react';

function LogTable({ logs, onExport }) {
    return (
        <div className="table-container">
            <div className="header-actions">
                <h2>Raporty Wejść / Wyjść</h2>
                <button className="btn-export" onClick={onExport}>📥 Eksportuj do CSV</button>
            </div>
            <table className="employee-table">
                <thead>
                <tr>
                    <th>Czas</th>
                    <th>Pracownik</th>
                    <th>Status</th>
                    <th>Opis zdarzenia</th>
                    <th>Dowód</th>
                    {/* NOWA KOLUMNA */}
                </tr>
                </thead>
                <tbody>
                {logs.map((log) => (
                    <tr key={log.id} style={{backgroundColor: log.status === 'error' ? '#fff0f0' : 'transparent'}}>
                        <td>{log.time}</td>
                        <td><strong>{log.employee}</strong></td>
                        <td>
                            {log.status === 'success' ?
                                <span className="badge badge-employee">OK</span> :
                                <span className="badge badge-admin">BŁĄD</span>
                            }
                        </td>
                        <td>{log.info}</td>
                        <td>
                            {/* Pokazujemy przycisk TYLKO przy błędach */}
                            {log.status === 'error' && (
                                <button
                                    title="Zobacz zdjęcie z kamery"
                                    style={{fontSize: '1.2em', cursor: 'pointer'}}
                                    onClick={() => alert("Tu otworzy się zdjęcie z kamery: " + log.employee)}
                                >
                                    📷
                                </button>
                            )}
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}

export default LogTable;