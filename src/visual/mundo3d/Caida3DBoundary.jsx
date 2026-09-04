import React from 'react';

/** Captura un import rechazado de una escena 3D y deja que el host muestre 2D. */
export default class Caida3DBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { fallo: false };
  }

  static getDerivedStateFromError() {
    return { fallo: true };
  }

  componentDidCatch() {
    this.props.onCaida();
  }

  render() {
    return this.state.fallo ? null : this.props.children;
  }
}
