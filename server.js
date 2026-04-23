const express = require("express");
const mysql = require("mysql2");
const path = require("path");

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Datenbankverbindung gemäss PDF
const con = mysql.createConnection({
    host: "134.21.219.165",
    port: 3306,
    user: "student",
    password: "wi2026$!",
    database: "employees"
});

con.connect((err) => {
    if (err) {
        console.error("Fehler bei der DB-Verbindung:", err);
        return;
    }
    console.log("Mit MySQL verbunden.");
});

// Hilfsfunktion für Fehlerantworten
function sendError(res, err) {
    console.error(err);
    res.status(500).json({
        success: false,
        message: "Fehler bei der Datenbankabfrage."
    });
}

/**
 * a-d:
 * 1) Suche nach Mitarbeitenden über Mitarbeiter-ID
 * Ausgabe: Mitarbeiter-ID, Vorname, Nachname, Abteilung, Jobtitel
 */
app.get("/api/search-employee", (req, res) => {
    const empNo = req.query.empNo;

    if (!empNo) {
        return res.status(400).json({
            success: false,
            message: "Bitte eine Mitarbeiter-ID eingeben."
        });
    }

    const sql = `
        SELECT 
            e.emp_no AS mitarbeiter_id,
            e.first_name AS vorname,
            e.last_name AS nachname,
            d.dept_name AS abteilung,
            t.title AS jobtitel
        FROM employees e
        LEFT JOIN dept_emp de 
            ON e.emp_no = de.emp_no 
            AND de.to_date = '9999-01-01'
        LEFT JOIN departments d 
            ON de.dept_no = d.dept_no
        LEFT JOIN titles t 
            ON e.emp_no = t.emp_no 
            AND t.to_date = '9999-01-01'
        WHERE e.emp_no = ?
        LIMIT 1
    `;

    con.query(sql, [empNo], (err, results) => {
        if (err) return sendError(res, err);

        res.json({
            success: true,
            columns: ["Mitarbeiter-ID", "Vorname", "Nachname", "Abteilung", "Jobtitel"],
            data: results
        });
    });
});

/**
 * 2) Anzeige von Mitarbeitenden einer Abteilung
 * Ausgabe: Vorname, Nachname
 * LIMIT 10
 */
app.get("/api/search-department", (req, res) => {
    const department = req.query.department;

    if (!department) {
        return res.status(400).json({
            success: false,
            message: "Bitte eine Abteilung auswählen."
        });
    }

    const sql = `
        SELECT 
            e.first_name AS vorname,
            e.last_name AS nachname
        FROM employees e
        INNER JOIN dept_emp de 
            ON e.emp_no = de.emp_no
            AND de.to_date = '9999-01-01'
        INNER JOIN departments d 
            ON de.dept_no = d.dept_no
        WHERE d.dept_name = ?
        LIMIT 10
    `;

    con.query(sql, [department], (err, results) => {
        if (err) return sendError(res, err);

        res.json({
            success: true,
            columns: ["Vorname", "Nachname"],
            data: results
        });
    });
});

/**
 * 3) Gehaltssuche
 * Ausgabe: Vorname, Nachname, Abteilung, Gehalt
 * Nur aktuelle Gehälter: salaries.to_date = '9999-01-01'
 * LIMIT 10
 */
app.get("/api/search-salary", (req, res) => {
    const minSalary = req.query.minSalary;
    const maxSalary = req.query.maxSalary;

    if (!minSalary || !maxSalary) {
        return res.status(400).json({
            success: false,
            message: "Bitte Minimum und Maximum eingeben."
        });
    }

    const sql = `
        SELECT 
            e.first_name AS vorname,
            e.last_name AS nachname,
            d.dept_name AS abteilung,
            s.salary AS gehalt
        FROM employees e
        INNER JOIN salaries s 
            ON e.emp_no = s.emp_no
            AND s.to_date = '9999-01-01'
        LEFT JOIN dept_emp de 
            ON e.emp_no = de.emp_no
            AND de.to_date = '9999-01-01'
        LEFT JOIN departments d 
            ON de.dept_no = d.dept_no
        WHERE s.salary BETWEEN ? AND ?
        LIMIT 10
    `;

    con.query(sql, [minSalary, maxSalary], (err, results) => {
        if (err) return sendError(res, err);

        res.json({
            success: true,
            columns: ["Vorname", "Nachname", "Abteilung", "Gehalt"],
            data: results
        });
    });
});

/**
 * Bonusaufgabe e)
 * Gehaltsstatistiken pro Abteilung:
 * Durchschnitt, Minimum, Maximum
 */
app.get("/api/salary-stats", (req, res) => {
    const sql = `
        SELECT
            d.dept_name AS abteilung,
            ROUND(AVG(s.salary), 2) AS durchschnittsgehalt,
            MIN(s.salary) AS min_gehalt,
            MAX(s.salary) AS max_gehalt
        FROM departments d
        INNER JOIN dept_emp de
            ON d.dept_no = de.dept_no
            AND de.to_date = '9999-01-01'
        INNER JOIN salaries s
            ON de.emp_no = s.emp_no
            AND s.to_date = '9999-01-01'
        GROUP BY d.dept_name
        ORDER BY d.dept_name
    `;

    con.query(sql, (err, results) => {
        if (err) return sendError(res, err);

        res.json({
            success: true,
            columns: ["Abteilung", "Durchschnittsgehalt", "Minimales Gehalt", "Maximales Gehalt"],
            data: results
        });
    });
});

app.listen(PORT, () => {
    console.log(`Server läuft auf http://localhost:${PORT}`);
});