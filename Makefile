.PHONY: kill-ports start start-frontend start-backend start-docs install install-frontend install-backend install-docs add-server add migrate collectstatic createsuperuser test makemigrations clean-migrations celery flower stop-all flush

BACKEND_DIR = server
DOCS_DIR = documentation

# Default port values (can be overridden)
client ?= 3000
server ?= 8000
docs ?= 3001

# Process tracking
PIDFILE_DIR = .pids
FRONTEND_PID = $(PIDFILE_DIR)/frontend.pid
BACKEND_PID = $(PIDFILE_DIR)/backend.pid
DOCS_PID = $(PIDFILE_DIR)/docs.pid
CELERY_WORKER_PID = $(PIDFILE_DIR)/celery_worker.pid
CELERY_BEAT_PID = $(PIDFILE_DIR)/celery_beat.pid
FLOWER_PID = $(PIDFILE_DIR)/flower.pid

# Frontend commands
FRONTEND_START = bun run dev --hostname 0.0.0.0 --port $(client)
FRONTEND_INSTALL = bun install
FRONTEND_ADD = bun add $(pkg)

# Backend commands
BACKEND_START = cd $(BACKEND_DIR) && pdm run uvicorn src.asgi:application --host 0.0.0.0 --port $(server) --reload
BACKEND_INSTALL = cd $(BACKEND_DIR) && pdm install
BACKEND_ADD = cd $(BACKEND_DIR) && pdm add $(pkg)
MIGRATE = cd $(BACKEND_DIR) && pdm run python manage.py migrate $(if $(db), --database=$(db),)
FLUSH = cd $(BACKEND_DIR) && pdm run python manage.py flush --noinput
MAKEMIGRATIONS = cd $(BACKEND_DIR) && pdm run python manage.py makemigrations $(if $(md),$(md),)
COLLECT_STATIC = cd $(BACKEND_DIR) && pdm run python manage.py collectstatic --noinput
CREATE_SUPERUSER = cd $(BACKEND_DIR) && pdm run python manage.py createsuperuser

# Documentation commands
DOCS_START = cd $(DOCS_DIR) && npm start -- --port $(docs)
DOCS_INSTALL = cd $(DOCS_DIR) && npm install
DOCS_BUILD = cd $(DOCS_DIR) && npm run build
DOCS_SERVE = cd $(DOCS_DIR) && npm run serve -- --port $(docs)

# Celery commands
CELERY_WORKER = cd $(BACKEND_DIR) && pdm run celery -A celery_app worker --loglevel=info -Q celery,management_queue,payout_queue,invoice_queue,reminder_queue
CELERY_BEAT = cd $(BACKEND_DIR) && pdm run celery -A celery_app beat --loglevel=info
FLOWER = cd $(BACKEND_DIR) && pdm run celery -A celery_app flower --port=5555
UPDATE_SCHEDULE = cd $(BACKEND_DIR) && pdm run python manage.py update_celery_schedule

# Create PID directory
$(PIDFILE_DIR):
	@mkdir -p $(PIDFILE_DIR)

super-kill-ports:
	@echo "Killing processes on ports $(server), $(client), and $(docs)..."
	@sudo lsof -ti:$(server) | xargs -r sudo kill -9 || echo "No process running on port $(server)"
	@sudo lsof -ti:$(client) | xargs -r sudo kill -9 || echo "No process running on port $(client)"
	@sudo lsof -ti:$(docs) | xargs -r sudo kill -9 || echo "No process running on port $(docs)"

# Kill processes by port and name
kill-ports:
	@echo "🔄 Killing processes on ports $(server), $(client), $(docs), and 5555..."
	@# Kill by port
	@for port in $(server) $(client) $(docs) 5555; do \
		pid=$$(lsof -ti:$$port 2>/dev/null || echo ""); \
		if [ -n "$$pid" ]; then \
			echo "  Killing process $$pid on port $$port"; \
			kill -TERM $$pid 2>/dev/null || kill -9 $$pid 2>/dev/null || true; \
		fi; \
	done
	@# Kill Celery processes by name
	@echo "🔄 Killing Celery processes..."
	@pkill -f "celery.*worker" 2>/dev/null || echo "  No Celery worker processes found"
	@pkill -f "celery.*beat" 2>/dev/null || echo "  No Celery beat processes found"
	@pkill -f "celery.*flower" 2>/dev/null || echo "  No Flower processes found"
	@# Kill uvicorn processes
	@pkill -f "uvicorn.*asgi" 2>/dev/null || echo "  No uvicorn processes found"
	@# Kill bun dev processes
	@pkill -f "bun.*dev" 2>/dev/null || echo "  No bun dev processes found"
	@# Kill npm start processes (documentation)
	@pkill -f "npm.*start" 2>/dev/null || echo "  No npm start processes found"
	@pkill -f "docusaurus.*start" 2>/dev/null || echo "  No docusaurus processes found"
	@# Clean up PID files
	@rm -rf $(PIDFILE_DIR)
	@echo "✅ Process cleanup complete"

# Stop all services gracefully
stop-all:
	@echo "🛑 Stopping all services..."
	@# Stop frontend
	@if [ -f $(FRONTEND_PID) ]; then \
		pid=$$(cat $(FRONTEND_PID)); \
		if ps -p $$pid > /dev/null 2>&1; then \
			echo "  Stopping frontend (PID: $$pid)..."; \
			kill -TERM $$pid 2>/dev/null || kill -9 $$pid 2>/dev/null || true; \
		fi; \
		rm -f $(FRONTEND_PID); \
	fi
	@# Stop backend
	@if [ -f $(BACKEND_PID) ]; then \
		pid=$$(cat $(BACKEND_PID)); \
		if ps -p $$pid > /dev/null 2>&1; then \
			echo "  Stopping backend (PID: $$pid)..."; \
			kill -TERM $$pid 2>/dev/null || kill -9 $$pid 2>/dev/null || true; \
		fi; \
		rm -f $(BACKEND_PID); \
	fi
	@# Stop documentation
	@if [ -f $(DOCS_PID) ]; then \
		pid=$$(cat $(DOCS_PID)); \
		if ps -p $$pid > /dev/null 2>&1; then \
			echo "  Stopping documentation (PID: $$pid)..."; \
			kill -TERM $$pid 2>/dev/null || kill -9 $$pid 2>/dev/null || true; \
		fi; \
		rm -f $(DOCS_PID); \
	fi
	@# Stop Celery worker
	@if [ -f $(CELERY_WORKER_PID) ]; then \
		pid=$$(cat $(CELERY_WORKER_PID)); \
		if ps -p $$pid > /dev/null 2>&1; then \
			echo "  Stopping Celery worker (PID: $$pid)..."; \
			kill -TERM $$pid 2>/dev/null || kill -9 $$pid 2>/dev/null || true; \
		fi; \
		rm -f $(CELERY_WORKER_PID); \
	fi
	@# Stop Celery beat
	@if [ -f $(CELERY_BEAT_PID) ]; then \
		pid=$$(cat $(CELERY_BEAT_PID)); \
		if ps -p $$pid > /dev/null 2>&1; then \
			echo "  Stopping Celery beat (PID: $$pid)..."; \
			kill -TERM $$pid 2>/dev/null || kill -9 $$pid 2>/dev/null || true; \
		fi; \
		rm -f $(CELERY_BEAT_PID); \
	fi
	@# Stop Flower
	@if [ -f $(FLOWER_PID) ]; then \
		pid=$$(cat $(FLOWER_PID)); \
		if ps -p $$pid > /dev/null 2>&1; then \
			echo "  Stopping Flower (PID: $$pid)..."; \
			kill -TERM $$pid 2>/dev/null || kill -9 $$pid 2>/dev/null || true; \
		fi; \
		rm -f $(FLOWER_PID); \
	fi
	@# Fallback: kill any remaining processes by name
	@echo "  Cleaning up any remaining processes..."
	@pkill -f "celery.*worker" 2>/dev/null || echo "    No Celery worker processes found"
	@pkill -f "celery.*beat" 2>/dev/null || echo "    No Celery beat processes found"
	@pkill -f "celery.*flower" 2>/dev/null || echo "    No Celery flower processes found"
	@pkill -f "uvicorn.*asgi" 2>/dev/null || echo "    No uvicorn processes found"
	@pkill -f "bun.*dev" 2>/dev/null || echo "    No bun dev processes found"
	@pkill -f "npm.*start" 2>/dev/null || echo "    No npm start processes found"
	@pkill -f "docusaurus.*start" 2>/dev/null || echo "    No docusaurus processes found"
	@# Clean up PID directory
	@rm -rf $(PIDFILE_DIR)
	@echo "✅ All services stopped"

# Start all services with proper signal handling
start: $(PIDFILE_DIR)
	@echo "🚀 Starting full development environment..."
	@$(MAKE) kill-ports
	@echo "🔄 Updating Celery schedule from database..."
	@$(UPDATE_SCHEDULE)
	@# Set up signal trap to handle Ctrl+C
	@trap 'echo ""; echo "🛑 Received interrupt signal, stopping all services..."; $(MAKE) stop-all; exit 130' INT TERM; \
	echo "🎯 Starting services (Press Ctrl+C to stop all)..."; \
	$(MAKE) start-frontend & echo $$! > $(FRONTEND_PID); \
	$(MAKE) start-backend & echo $$! > $(BACKEND_PID); \
	$(MAKE) start-docs & echo $$! > $(DOCS_PID); \
	$(MAKE) celery-worker & echo $$! > $(CELERY_WORKER_PID); \
	$(MAKE) celery-beat & echo $$! > $(CELERY_BEAT_PID); \
	$(MAKE) flower & echo $$! > $(FLOWER_PID); \
	echo "✅ All services started. Press Ctrl+C to stop."; \
	echo "🌐 Frontend: http://localhost:$(client)"; \
	echo "🔧 Backend: http://localhost:$(server)"; \
	echo "📚 Documentation: http://localhost:$(docs)"; \
	echo "🌸 Flower: http://localhost:5555"; \
	wait

# Start services without Celery (for development)
start-dev: $(PIDFILE_DIR)
	@echo "🚀 Starting development environment (frontend + backend + docs)..."
	@$(MAKE) kill-ports
	@# Set up signal trap to handle Ctrl+C
	@trap 'echo ""; echo "🛑 Received interrupt signal, stopping services..."; $(MAKE) stop-all; exit 130' INT TERM; \
	echo "🎯 Starting services (Press Ctrl+C to stop all)..."; \
	$(MAKE) start-frontend & echo $$! > $(FRONTEND_PID); \
	$(MAKE) start-backend & echo $$! > $(BACKEND_PID); \
	$(MAKE) start-docs & echo $$! > $(DOCS_PID); \
	echo "✅ Development services started. Press Ctrl+C to stop."; \
	echo "🌐 Frontend: http://localhost:$(client)"; \
	echo "🔧 Backend: http://localhost:$(server)"; \
	echo "📚 Documentation: http://localhost:$(docs)"; \
	wait

start-frontend:
	@echo "🌐 Starting frontend on port $(client)..."
	@$(FRONTEND_START)

start-backend:
	@echo "🔧 Starting backend on port $(server)..."
	@$(BACKEND_START)

start-docs:
	@echo "📚 Starting documentation on port $(docs)..."
	@$(DOCS_START)

# Install dependencies for all components
install: install-frontend install-backend install-docs

install-frontend:
	@echo "📦 Installing frontend dependencies..."
	@$(FRONTEND_INSTALL)

install-backend:
	@echo "📦 Installing backend dependencies..."
	@$(BACKEND_INSTALL)

install-docs:
	@echo "📚 Installing documentation dependencies..."
	@$(DOCS_INSTALL)

# Add a package dynamically
add-server:
	@echo "➕ Adding package to backend: $(pkg)"
	@$(BACKEND_ADD)

add:
	@echo "➕ Adding package to frontend: $(pkg)"
	@$(FRONTEND_ADD)

add-docs:
	@echo "📚 Adding package to documentation: $(pkg)"
	@cd $(DOCS_DIR) && npm install $(pkg)

# Database operations
makemigrations:
	@echo "📝 Running Django makemigrations..."
	@$(MAKEMIGRATIONS)

migrate:
	@echo "🔄 Running Django migrations..."
	@$(MIGRATE)

flush:
	@echo "🔄 Flushing database..."
	@$(FLUSH)

collectstatic:
	@echo "📁 Collecting static files..."
	@$(COLLECT_STATIC)

createsuperuser:
	@echo "👤 Creating Django superuser..."
	@$(CREATE_SUPERUSER)

# Documentation operations
docs-build:
	@echo "📚 Building documentation..."
	@$(DOCS_BUILD)

docs-serve:
	@echo "📚 Serving built documentation on port $(docs)..."
	@$(DOCS_SERVE)

# Clean migrations and reset environment
clean-migrations:
	@echo "🧹 Cleaning migrations and resetting environment..."
	@echo "  Removing migration files..."
	@find $(BACKEND_DIR) -type d -name "migrations" -exec find {} -type f ! -name "__init__.py" -name "*.py" -delete \;
	@echo "  Removing virtual environment..."
	@rm -rf $(BACKEND_DIR)/.venv
	@echo "  Reinstalling dependencies..."
	@$(MAKE) install-backend
	@echo "✅ Environment reset complete"

# Celery services (individual targets for better control)
celery-worker:
	@echo "⚙️  Starting Celery worker..."
	@$(CELERY_WORKER)

celery-beat:
	@echo "🔄 Updating Celery schedule from database..."
	@$(UPDATE_SCHEDULE)
	@echo "⏰ Starting Celery beat..."
	@$(CELERY_BEAT)

flower:
	@echo "🌸 Starting Flower monitoring on port 5555..."
	@$(FLOWER)

# Combined Celery start (legacy support)
celery:
	@echo "⚙️  Starting Celery worker and beat..."
	@trap 'echo ""; echo "🛑 Stopping Celery services..."; exit 130' INT TERM; \
	$(CELERY_WORKER) & \
	$(CELERY_BEAT) & \
	wait

# Development shortcuts
dev: start-dev

quick-start: start-dev

# Health check
status:
	@echo "🔍 Checking service status..."
	@echo "Frontend (port $(client)):" && (lsof -ti:$(client) >/dev/null 2>&1 && echo "  ✅ Running" || echo "  ❌ Not running")
	@echo "Backend (port $(server)):" && (lsof -ti:$(server) >/dev/null 2>&1 && echo "  ✅ Running" || echo "  ❌ Not running")
	@echo "Documentation (port $(docs)):" && (lsof -ti:$(docs) >/dev/null 2>&1 && echo "  ✅ Running" || echo "  ❌ Not running")
	@echo "Flower (port 5555):" && (lsof -ti:5555 >/dev/null 2>&1 && echo "  ✅ Running" || echo "  ❌ Not running")
	@echo "Celery worker:" && (pgrep -f "celery.*worker" >/dev/null 2>&1 && echo "  ✅ Running" || echo "  ❌ Not running")
	@echo "Celery beat:" && (pgrep -f "celery.*beat" >/dev/null 2>&1 && echo "  ✅ Running" || echo "  ❌ Not running")

# Help command
help:
	@echo "🛠️  Available commands:"
	@echo "  start          - Start all services (frontend, backend, docs, celery, flower)"
	@echo "  start-dev      - Start development services (frontend, backend, docs)"
	@echo "  quick-start    - Start only frontend, backend, and docs"
	@echo "  stop-all       - Stop all running services"
	@echo "  status         - Check status of all services"
	@echo "  install        - Install all dependencies"
	@echo "  migrate        - Run Django migrations"
	@echo "  makemigrations - Create Django migrations"
	@echo "  collectstatic  - Collect static files"
	@echo "  createsuperuser- Create Django superuser"
	@echo "  clean-migrations - Reset migrations and environment"
	@echo "  docs-build     - Build documentation for production"
	@echo "  docs-serve     - Serve built documentation"
	@echo "  help           - Show this help message"
	@echo ""
	@echo "🎯 Usage examples:"
	@echo "  make start                    # Start all services"
	@echo "  make start-dev                # Start dev services (no celery)"
	@echo "  make start client=3001       # Start with custom frontend port"
	@echo "  make start docs=3002         # Start with custom docs port"
	@echo "  make add pkg=axios           # Add frontend package"
	@echo "  make add-server pkg=django-cors-headers  # Add backend package"
	@echo "  make add-docs pkg=@docusaurus/plugin-google-analytics  # Add docs package"
	@echo ""
	@echo "🌐 Service URLs (default ports):"
	@echo "  Frontend:      http://localhost:$(client)"
	@echo "  Backend:       http://localhost:$(server)"
	@echo "  Documentation: http://localhost:$(docs)"
	@echo "  Flower:        http://localhost:5555"