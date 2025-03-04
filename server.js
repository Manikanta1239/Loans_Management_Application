const express = require('express');
const cors = require('cors');
const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Sequelize connection
const sequelize = new Sequelize({
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false
});

// Define Loan model
const Loan = sequelize.define('Loan', {
    borrower_name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    loan_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    interest_rate: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false
    },
    start_date: {
        type: DataTypes.DATE,
        allowNull: false
    },
    end_date: {
        type: DataTypes.DATE,
        allowNull: false
    },
    repayment_date: {
        type: DataTypes.DATE,
        allowNull: false
    },
    status: {
        type: DataTypes.STRING(20),
        defaultValue: 'active'
    },
    reminder_sent: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    auto_debit: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    account_number: {
        type: DataTypes.STRING(20)
    }
});

// Routes
// Get all loans
app.get('/api/loans', async (req, res) => {
    try {
        const loans = await Loan.findAll({
            order: [['createdAt', 'DESC']]
        });
        res.json(loans);
    } catch (err) {
        console.error('Error fetching loans:', err);
        res.status(500).json({ error: 'Error fetching loans' });
    }
});

// Add new loan
app.post('/api/loans', async (req, res) => {
    try {
        const loan = await Loan.create(req.body);
        res.status(201).json(loan);
    } catch (err) {
        console.error('Error adding loan:', err);
        res.status(500).json({ error: 'Error adding loan' });
    }
});

// Update loan
app.put('/api/loans/:id', async (req, res) => {
    try {
        const [updated] = await Loan.update(req.body, {
            where: { id: req.params.id }
        });

        if (updated) {
            const updatedLoan = await Loan.findByPk(req.params.id);
            res.json(updatedLoan);
        } else {
            res.status(404).json({ error: 'Loan not found' });
        }
    } catch (err) {
        console.error('Error updating loan:', err);
        res.status(500).json({ error: 'Error updating loan' });
    }
});

// Delete loan
app.delete('/api/loans/:id', async (req, res) => {
    try {
        const deleted = await Loan.destroy({
            where: { id: req.params.id }
        });

        if (deleted) {
            res.json({ message: 'Loan deleted successfully' });
        } else {
            res.status(404).json({ error: 'Loan not found' });
        }
    } catch (err) {
        console.error('Error deleting loan:', err);
        res.status(500).json({ error: 'Error deleting loan' });
    }
});

// Get loan by ID
app.get('/api/loans/:id', async (req, res) => {
    try {
        const loan = await Loan.findByPk(req.params.id);
        if (!loan) {
            return res.status(404).json({ error: 'Loan not found' });
        }
        res.json(loan);
    } catch (err) {
        console.error('Error fetching loan:', err);
        res.status(500).json({ error: 'Error fetching loan details' });
    }
});

// Check for upcoming repayments
async function checkRepayments() {
    try {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const loans = await Loan.findAll({
            where: {
                repayment_date: tomorrow,
                status: 'active',
                reminder_sent: false
            }
        });

        for (const loan of loans) {
            // Implement reminder logic here (email, SMS, etc.)
            console.log(`Reminder for loan ID ${loan.id}: Payment due tomorrow`);
            await loan.update({ reminder_sent: true });
        }
    } catch (err) {
        console.error('Error checking repayments:', err);
    }
}

// Initialize database and start server
const PORT = process.env.PORT || 3000;

sequelize.sync({ alter: true })
    .then(() => {
        console.log('Database synchronized');
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            // Check for repayments every day at midnight
            setInterval(checkRepayments, 24 * 60 * 60 * 1000);
        });
    })
    .catch(err => {
        console.error('Error syncing database:', err);
    });