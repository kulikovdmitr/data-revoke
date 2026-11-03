IMAGE   ?= data-revoke
PORT    ?= 8000
RUN     = docker run --rm -v $(PWD):/app -w /app $(IMAGE)

.PHONY: build up shell validate test fmt

build:            ## собрать образ
	docker build -t $(IMAGE) .

up-local: 
	docker compose up --build

test: build
 	$(RUN) pytest -q

fmt: build
 	$(RUN) ruff format .