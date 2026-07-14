-- PostgreSQL Schema Design for AI Manufacturing Data Platform
-- Designed for Smart Factory Analytics and Anomaly Detection

-- 1. Users Table (RBAC Authentication)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'ENGINEER', 'OPERATOR', 'MANAGER')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Machines Table
CREATE TABLE IF NOT EXISTS machines (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL,
    location VARCHAR(100),
    status VARCHAR(20) DEFAULT 'OPERATIONAL' CHECK (status IN ('OPERATIONAL', 'MAINTENANCE', 'OFFLINE', 'FAILING')),
    installation_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Sensor Data Table (High-Frequency Metrics)
CREATE TABLE IF NOT EXISTS sensor_data (
    id BIGSERIAL PRIMARY KEY,
    machine_id INT REFERENCES machines(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    temperature NUMERIC(6, 2) NOT NULL,
    pressure NUMERIC(6, 2) NOT NULL,
    humidity NUMERIC(5, 2) NOT NULL,
    voltage NUMERIC(5, 2) NOT NULL,
    current NUMERIC(5, 2) NOT NULL,
    rpm NUMERIC(6, 2) NOT NULL,
    vibration NUMERIC(5, 2) NOT NULL,
    energy_consumption NUMERIC(6, 2) NOT NULL,
    is_anomaly BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexing for fast analytics on sensor_data
CREATE INDEX IF NOT EXISTS idx_sensor_data_machine_timestamp ON sensor_data(machine_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_data_timestamp ON sensor_data(timestamp DESC);

-- 4. Production Table (Yield & Shifts)
CREATE TABLE IF NOT EXISTS production (
    id SERIAL PRIMARY KEY,
    machine_id INT REFERENCES machines(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    shift_type VARCHAR(20) NOT NULL CHECK (shift_type IN ('MORNING', 'AFTERNOON', 'NIGHT')),
    production_count INT NOT NULL DEFAULT 0,
    defect_count INT NOT NULL DEFAULT 0,
    oee_score NUMERIC(5, 2), -- Overall Equipment Effectiveness (Availability * Performance * Quality)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_production_machine_timestamp ON production(machine_id, timestamp DESC);

-- 5. Quality Inspection Table (CV Results)
CREATE TABLE IF NOT EXISTS quality_inspection (
    id SERIAL PRIMARY KEY,
    production_id INT REFERENCES production(id) ON DELETE SET NULL,
    machine_id INT REFERENCES machines(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    defect_type VARCHAR(50) CHECK (defect_type IN ('NONE', 'LABEL_MISSING', 'SURFACE_CRACK', 'DAMAGE', 'WRONG_COLOR', 'WRONG_PACKAGING', 'WRONG_DIMENSION')),
    inspection_status VARCHAR(10) NOT NULL CHECK (inspection_status IN ('PASS', 'FAIL')),
    confidence_score NUMERIC(4, 3) NOT NULL,
    image_path VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quality_inspection_status ON quality_inspection(inspection_status);

-- 6. Maintenance Logs Table
CREATE TABLE IF NOT EXISTS maintenance_logs (
    id SERIAL PRIMARY KEY,
    machine_id INT REFERENCES machines(id) ON DELETE CASCADE,
    log_date TIMESTAMP WITH TIME ZONE NOT NULL,
    maintenance_type VARCHAR(20) NOT NULL CHECK (maintenance_type IN ('PREVENTIVE', 'CORRECTIVE', 'PREDICTIVE')),
    description TEXT NOT NULL,
    technician VARCHAR(100) NOT NULL,
    duration_hours NUMERIC(4, 2) NOT NULL,
    cost NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_maintenance_logs_machine ON maintenance_logs(machine_id);

-- 7. Predictions Table (ML Output)
CREATE TABLE IF NOT EXISTS predictions (
    id SERIAL PRIMARY KEY,
    machine_id INT REFERENCES machines(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    failure_probability NUMERIC(4, 3) NOT NULL,
    health_score NUMERIC(5, 2) NOT NULL,
    recommendation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_predictions_machine_timestamp ON predictions(machine_id, timestamp DESC);

-- 8. Alerts Table (Rule-based & AI-based Alerts)
CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    machine_id INT REFERENCES machines(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED')),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_alerts_status_severity ON alerts(status, severity);
