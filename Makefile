SHELL := /bin/sh

.PHONY: start stop start-backend start-frontend stop-backend stop-frontend stop-ports status

PID_DIR := .pids
BACKEND_PID := $(PID_DIR)/backend.pid
FRONTEND_PID := $(PID_DIR)/frontend.pid
BACKEND_LOG := $(PID_DIR)/backend.log

start: stop-ports start-backend start-frontend

stop: stop-frontend stop-backend
	@$(MAKE) stop-ports

start-backend:
	@mkdir -p $(PID_DIR)
	@if [ -f "$(BACKEND_PID)" ] && kill -0 "$$(cat $(BACKEND_PID))" 2>/dev/null; then \
		echo "Backend already running (pid $$(cat $(BACKEND_PID)))."; \
	else \
		rm -f "$(BACKEND_PID)"; \
		./scripts/start-backend.sh >"$(BACKEND_LOG)" 2>&1 & echo $$! >"$(BACKEND_PID)"; \
		sleep 2; \
		if kill -0 "$$(cat $(BACKEND_PID))" 2>/dev/null; then \
			echo "Backend running (pid $$(cat $(BACKEND_PID))), logs at $(BACKEND_LOG)"; \
		else \
			echo "Backend failed to start. Check $(BACKEND_LOG)"; \
			cat "$(BACKEND_LOG)"; \
			exit 1; \
		fi; \
	fi

start-frontend:
	@mkdir -p $(PID_DIR)
	@echo "Starting frontend (Next.js)..."
	@./scripts/start-frontend.sh

stop-backend:
	@if [ -f "$(BACKEND_PID)" ]; then \
		pid=$$(cat "$(BACKEND_PID)"); \
		if kill -0 "$$pid" 2>/dev/null; then \
			echo "Stopping backend (pid $$pid)..."; \
			kill -TERM -$$pid 2>/dev/null || true; \
			sleep 1; \
			if kill -0 "$$pid" 2>/dev/null; then \
				echo "Backend still running, forcing stop..."; \
				kill -KILL -$$pid 2>/dev/null || true; \
			fi; \
		else \
			echo "Backend not running."; \
		fi; \
		rm -f "$(BACKEND_PID)"; \
	else \
		echo "Backend pid not found."; \
	fi

stop-frontend:
	@if [ -f "$(FRONTEND_PID)" ]; then \
		pid=$$(cat "$(FRONTEND_PID)"); \
		if kill -0 "$$pid" 2>/dev/null; then \
			echo "Stopping frontend (pid $$pid)..."; \
			kill -TERM -$$pid 2>/dev/null || true; \
			sleep 1; \
			if kill -0 "$$pid" 2>/dev/null; then \
				echo "Frontend still running, forcing stop..."; \
				kill -KILL -$$pid 2>/dev/null || true; \
			fi; \
		else \
			echo "Frontend not running."; \
		fi; \
		rm -f "$(FRONTEND_PID)"; \
	else \
		echo "Frontend pid not found."; \
	fi

stop-ports:
	@# Ensure no stray processes are holding the default ports
	@for port in 3000 8080; do \
		pids=$$(lsof -tiTCP:$$port -sTCP:LISTEN 2>/dev/null || true); \
		if [ -n "$$pids" ]; then \
			echo "Stopping processes on port $$port (pid(s) $$pids)..."; \
			kill -TERM $$pids 2>/dev/null || true; \
		fi; \
	done

status:
	@if [ -f "$(BACKEND_PID)" ] && kill -0 "$$(cat $(BACKEND_PID))" 2>/dev/null; then \
		echo "Backend: running (pid $$(cat $(BACKEND_PID)))."; \
	else \
		echo "Backend: stopped."; \
	fi
	@echo "Frontend: check terminal output (runs in foreground)."
