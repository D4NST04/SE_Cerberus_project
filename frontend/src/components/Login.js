import React, { useState } from 'react';

function Login({ onLogin }) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();

        // Tutaj ustawiamy login i hasło "na sztywno" dla admina
        // W przyszłości można to przenieść do zmiennych środowiskowych (.env)
        if (username === "ioio" && password === "bajojajo") {
            onLogin(true);
        } else {
            setError("Nieprawidłowy login lub hasło 🔒");
            onLogin(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.box}>
                <h1 style={{marginBottom: '20px'}}>Log In</h1>
                <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                    <input
                        type="text"
                        placeholder="Login"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        style={styles.input}
                    />
                    <input
                        type="password"
                        placeholder="Hasło"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        style={styles.input}
                    />
                    <button type="submit" style={styles.button}>Zaloguj</button>
                </form>
                {error && <p style={{color: 'red', marginTop: '10px'}}>{error}</p>}
            </div>
        </div>
    );
}

// Proste style wewnątrz pliku, żeby nie śmiecić w CSS
const styles = {
    container: {
        height: '100vh',
        width: '100vw',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#282c34',
        color: 'white'
    },
    box: {
        padding: '40px',
        backgroundColor: '#3b404b',
        borderRadius: '10px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
        textAlign: 'center'
    },
    input: {
        padding: '10px',
        fontSize: '16px',
        borderRadius: '5px',
        border: '1px solid #ccc'
    },
    button: {
        padding: '10px',
        fontSize: '16px',
        fontWeight: 'bold',
        backgroundColor: '#61dafb',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        marginTop: '10px'
    }
};

export default Login;